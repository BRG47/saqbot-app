/**
 * SaqBot worker: runs the Telegram bot and sends alerts.
 * Start with `npm run worker` on an always-on host (Railway, Fly.io).
 *
 * Telegram is read-only: nothing here can place trades or move money.
 */
import { Bot } from "grammy";
import { CONTACT_EMAIL } from "../lib/config";
import { BLS_ICS_URL, FOMC_DECISION_DAYS, blsEvents, expiryEvents, fomcEvents, type SyncedEvent } from "../lib/calendar";
import { EVENT_TYPES, starsFromMove, type EventType } from "../lib/events";
import { getAccountState, getMarkets, getMids, info } from "../lib/hyperliquid";
import { sql } from "../lib/server/db";
import { claimAlert, sendPush, sendTelegram } from "../lib/server/notify";

type Alerts = { push?: boolean; telegram?: boolean; events?: boolean; moves?: boolean; crowded?: boolean; heat?: boolean; watchlist?: string[] };
type UserRow = { id: string; wallet: string | null; alerts: Alerts; telegram_chat_id: string | null };

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
const bot = new Bot(token);

const users = () => sql<UserRow[]>`select id, wallet, alerts, telegram_chat_id from users`;
const hourBucket = () => Math.floor(Date.now() / 3_600_000);

/** Delivers one alert to every channel the user switched on. */
async function deliver(u: UserRow, title: string, body: string, path: string) {
  const jobs: Promise<unknown>[] = [];
  if (u.alerts.telegram && u.telegram_chat_id) {
    jobs.push(sendTelegram(u.telegram_chat_id, `<b>${title}</b>\n${body}`, { label: "Open SaqBot", path }));
  }
  if (u.alerts.push !== false) jobs.push(sendPush(u.id, title, body, path));
  await Promise.allSettled(jobs);
}

// ---------- Telegram commands ----------

bot.command("start", async (ctx) => {
  const code = ctx.match?.trim();
  if (!code) {
    return ctx.reply(
      "Welcome to SaqBot. I send heat alerts on your jobs, big market moves and 5-star events.\n\nTo link me, open SaqBot, go to Alerts and switch on Telegram.\n\nI'll never ask for your seed phrase or keys.",
    );
  }
  const [link] = await sql<{ user_id: string }[]>`
    delete from telegram_links where code = ${code} and expires_at > now() returning user_id`;
  if (!link) return ctx.reply("That link expired. Open SaqBot, go to Alerts and switch Telegram on again.");
  await sql`update users set telegram_chat_id = null where telegram_chat_id = ${ctx.chat.id}`;
  await sql`update users set telegram_chat_id = ${ctx.chat.id}, alerts = alerts || '{"telegram": true}'::jsonb where id = ${link.user_id}`;
  return ctx.reply("Linked. You'll get your SaqBot alerts here. Send /stop anytime to unlink.");
});

bot.command("stop", async (ctx) => {
  await sql`update users set telegram_chat_id = null, alerts = alerts || '{"telegram": false}'::jsonb where telegram_chat_id = ${ctx.chat.id}`;
  return ctx.reply("Unlinked. No more alerts here.");
});

bot.command("events", async (ctx) => {
  const rows = await sql<{ title: string; starts_at: Date; stars: number | null; type: EventType }[]>`
    select e.title, e.starts_at, e.type, r.stars from market_events e left join event_ratings r on r.type = e.type
    where e.starts_at > now() and e.starts_at < now() + interval '7 days' order by e.starts_at limit 10`;
  if (rows.length === 0) return ctx.reply("No 5-star events scheduled this week. Quiet streets.");
  const lines = rows.map((r) => `${"★".repeat(r.stars ?? EVENT_TYPES[r.type]?.fallbackStars ?? 2)} ${r.title}, ${r.starts_at.toUTCString().slice(0, 22)} UTC`);
  return ctx.reply(`Upcoming 5-star events:\n\n${lines.join("\n")}`);
});

bot.catch((err) => console.error("Bot error", err));

// ---------- Alert loops ----------

/** Heat on active jobs: price close to the stop or to liquidation. */
async function heatLoop() {
  const mids = await getMids();
  for (const u of await users()) {
    if (!u.wallet || u.alerts.heat === false) continue;
    try {
      const state = await getAccountState(u.wallet as `0x${string}`);
      for (const p of state.positions) {
        const mark = mids[p.coin];
        if (!mark) continue;
        const name = `${p.coin} ${p.side}`;
        if (p.liqPx && Math.abs(mark - p.liqPx) / mark < 0.03) {
          if (await claimAlert(`heat:${u.id}:${p.coin}:liq:${hourBucket()}`)) {
            await deliver(u, `5-star heat on your ${name}`, `Price is within 3% of liquidation (${p.liqPx}). Cash out, add margin or set a stop now.`, "/jobs");
          }
        } else if (p.stopPx && Math.abs(mark - p.stopPx) / mark < 0.01) {
          if (await claimAlert(`heat:${u.id}:${p.coin}:stop:${hourBucket()}`)) {
            await deliver(u, `Heat's rising on your ${name}`, `Price is within 1% of your stop at ${p.stopPx}. If it hits, the loss stays what you planned.`, "/jobs");
          }
        }
      }
    } catch (e) {
      console.error("heat check failed", u.id, e);
    }
  }
}

/** Big moves: the last full hour moved sharply on at least twice the usual volume. */
async function movesLoop() {
  const all = await users();
  const coins = new Set(all.filter((u) => u.alerts.moves !== false).flatMap((u) => u.alerts.watchlist ?? ["BTC", "ETH", "SOL"]));
  for (const coin of coins) {
    try {
      const candles = await info.candleSnapshot({ coin, interval: "1h", startTime: Date.now() - 26 * 3_600_000 });
      if (candles.length < 6) continue;
      const last = candles[candles.length - 2]; // last fully closed hour
      const prior = candles.slice(0, -2);
      const change = (Number(last.c) / Number(last.o) - 1) * 100;
      const avgVol = prior.reduce((s, c) => s + Number(c.v), 0) / prior.length;
      const threshold = coin === "BTC" || coin === "ETH" ? 2 : 4;
      if (Math.abs(change) < threshold || Number(last.v) < avgVol * 2) continue;
      const title = `${coin} ${change > 0 ? "ripped" : "dumped"} ${Math.abs(change).toFixed(1)}% in an hour`;
      const body = `Volume was ${(Number(last.v) / avgVol).toFixed(1)}x the usual. Moves like this often bring more heat. Check your jobs.`;
      for (const u of all) {
        if (u.alerts.moves === false || !(u.alerts.watchlist ?? ["BTC", "ETH", "SOL"]).includes(coin)) continue;
        if (await claimAlert(`move:${u.id}:${coin}:${last.t}`)) await deliver(u, title, body, "/home");
      }
    } catch (e) {
      console.error("move check failed", coin, e);
    }
  }
}

/** Crowded trades: funding so high that one side is paying heavily to stay in. */
async function crowdedLoop() {
  const all = (await users()).filter((u) => u.alerts.crowded);
  if (all.length === 0) return;
  const markets = await getMarkets();
  const bucket = Math.floor(Date.now() / (6 * 3_600_000));
  for (const m of markets.slice(0, 40)) {
    if (Math.abs(m.funding) < 0.0001) continue;
    const longs = m.funding > 0;
    const title = `Crowded trade on ${m.name}`;
    const body = `${longs ? "Longs" : "Shorts"} are paying ${(Math.abs(m.funding) * 100).toFixed(3)}% an hour to stay in. Crowded sides can unwind fast.`;
    for (const u of all) {
      if (!(u.alerts.watchlist ?? []).includes(m.name)) continue;
      if (await claimAlert(`crowd:${u.id}:${m.name}:${bucket}`)) await deliver(u, title, body, "/home");
    }
  }
}

/** 5-star events: a heads-up the day before and an hour before. */
async function eventsLoop() {
  const soon = await sql<{ id: number; title: string; type: EventType; starts_at: Date; stars: number | null }[]>`
    select e.id, e.title, e.type, e.starts_at, r.stars from market_events e left join event_ratings r on r.type = e.type
    where e.starts_at > now() and e.starts_at < now() + interval '24 hours'`;
  if (soon.length === 0) return;
  const all = (await users()).filter((u) => u.alerts.events !== false);
  for (const e of soon) {
    const mins = (e.starts_at.getTime() - Date.now()) / 60_000;
    const stage = mins <= 60 ? "hour" : "day";
    const stars = e.stars ?? EVENT_TYPES[e.type]?.fallbackStars ?? 2;
    if (stars < 3 && stage === "day") continue;
    const title = `${"★".repeat(stars)} ${e.title} ${stage === "hour" ? "in under an hour" : "tomorrow"}`;
    const body = "Events like this have moved crypto hard before. Check your getaways and your size.";
    for (const u of all) {
      if (await claimAlert(`event:${u.id}:${e.id}:${stage}`)) await deliver(u, title, body, "/alerts");
    }
  }
}

/** Recomputes star ratings from how far BTC moved in the hours around past events of each type. */
async function ratingsLoop() {
  const past = await sql<{ type: EventType; starts_at: Date }[]>`
    select type, starts_at from market_events where starts_at < now() - interval '4 hours' and starts_at > now() - interval '200 days'`;
  const byType = new Map<EventType, number[]>();
  for (const e of past) {
    const t = e.starts_at.getTime();
    try {
      const candles = await info.candleSnapshot({ coin: "BTC", interval: "1h", startTime: t - 3_600_000, endTime: t + 4 * 3_600_000 });
      if (candles.length < 2) continue;
      const open = Number(candles[0].o);
      const maxMove = Math.max(...candles.map((c) => Math.max(Math.abs(Number(c.h) / open - 1), Math.abs(Number(c.l) / open - 1)))) * 100;
      byType.set(e.type, [...(byType.get(e.type) ?? []), maxMove]);
    } catch (err) {
      console.error("rating candles failed", e.type, err);
    }
  }
  for (const [type, moves] of byType) {
    if (moves.length < 3) continue;
    const avg = moves.reduce((s, m) => s + m, 0) / moves.length;
    await sql`
      insert into event_ratings (type, stars, avg_move_pct, samples, updated_at)
      values (${type}, ${starsFromMove(avg)}, ${avg}, ${moves.length}, now())
      on conflict (type) do update set stars = excluded.stars, avg_move_pct = excluded.avg_move_pct, samples = excluded.samples, updated_at = now()`;
  }
  await sql`delete from alerts_sent where sent_at < now() - interval '14 days'`;
}

/**
 * Free calendar sync: BLS jobs and CPI releases, FOMC rate decisions and options expiries.
 * Synced rows carry a source_id, so reschedules update in place and cancelled releases are removed.
 */
async function calendarLoop() {
  const events: SyncedEvent[] = [...fomcEvents(), ...expiryEvents(new Date(), 4)];

  let blsIds: string[] | null = null;
  try {
    const contact = process.env.CALENDAR_CONTACT_EMAIL ?? CONTACT_EMAIL;
    const res = await fetch(BLS_ICS_URL, { headers: { "user-agent": `SaqBot calendar sync (${contact})`, accept: "text/calendar" } });
    if (!res.ok) throw new Error(`BLS calendar returned ${res.status}`);
    const bls = blsEvents(await res.text());
    events.push(...bls);
    blsIds = bls.map((e) => e.sourceId);
  } catch (e) {
    console.error("BLS calendar fetch failed; keeping the events already saved", e);
  }

  const cutoff = Date.now() - 200 * 86_400_000;
  for (const e of events) {
    if (e.startsAt.getTime() < cutoff) continue;
    await sql`
      insert into market_events (source_id, type, title, detail, starts_at)
      values (${e.sourceId}, ${e.type}, ${e.title}, ${e.detail}, ${e.startsAt})
      on conflict (source_id) do update set type = excluded.type, title = excluded.title, detail = excluded.detail, starts_at = excluded.starts_at`;
  }

  // Remove future releases a source no longer lists (for example, a rescheduled or cancelled BLS release).
  if (blsIds && blsIds.length > 0) {
    await sql`delete from market_events where source_id like 'bls:%' and starts_at > now() and source_id not in ${sql(blsIds)}`;
  }
  const fomcIds = fomcEvents().map((e) => e.sourceId);
  await sql`delete from market_events where source_id like 'fomc:%' and starts_at > now() and source_id not in ${sql(fomcIds)}`;

  const lastFomc = FOMC_DECISION_DAYS[FOMC_DECISION_DAYS.length - 1];
  if (new Date(lastFomc).getTime() - Date.now() < 120 * 86_400_000) {
    console.warn(`FOMC dates in lib/calendar.ts run out on ${lastFomc}. Add next year's schedule from federalreserve.gov.`);
  }
  console.log(`Calendar sync: ${events.length} events checked${blsIds ? `, ${blsIds.length} from BLS` : ", BLS skipped"}`);
}

function every(ms: number, name: string, fn: () => Promise<void>) {
  const run = () => fn().catch((e) => console.error(`${name} failed`, e));
  run();
  setInterval(run, ms);
}

every(60_000, "heat", heatLoop);
every(5 * 60_000, "moves", movesLoop);
every(15 * 60_000, "crowded", crowdedLoop);
every(5 * 60_000, "events", eventsLoop);
every(12 * 3_600_000, "calendar", calendarLoop);
every(6 * 3_600_000, "ratings", ratingsLoop);

bot.start({ onStart: (me) => console.log(`SaqBot worker running as @${me.username}`) });
