/**
 * @TradeSaqBot: menus, settings and alert formatting.
 * Read-only by design: nothing here can place trades or move money.
 */
import { Bot, InlineKeyboard, type Context } from "grammy";
import { EVENT_TYPES, type EventType } from "../lib/events";
import { getAccountState, getMarkets, getMids } from "../lib/hyperliquid";
import { positionWantedLevel } from "../lib/planner";
import { REPS, type Rep } from "../lib/rep";
import { sql } from "../lib/server/db";

export type Alerts = {
  push?: boolean;
  telegram?: boolean;
  events?: boolean;
  moves?: boolean;
  crowded?: boolean;
  heat?: boolean;
  watchlist?: string[];
  /** ISO time until which non-critical alerts are paused. */
  mutedUntil?: string | null;
  /** Coins whose market alerts (big moves, crowded trades) are muted. */
  mutedCoins?: string[];
};

export type UserRow = { id: string; wallet: string | null; rep: Rep | null; alerts: Alerts; telegram_chat_id: string | null };

/** Every alert SaqBot sends, in one shape for Telegram and push. */
export type Alert = {
  kind: "heat" | "move" | "crowded" | "event";
  stars: number;
  /** Short label in caps, e.g. "5-STAR HEAT". */
  tag: string;
  headline: string;
  lines: string[];
  tip?: string;
  path: string;
  coin?: string;
  /** Liquidation warnings ignore mutes. */
  critical?: boolean;
};

const APP_URL = () => process.env.APP_URL ?? "https://saqbot.xyz";
const DEFAULT_WATCHLIST = ["BTC", "ETH", "SOL"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
export const fmtPx = (n: number) => n.toLocaleString("en-US", { maximumSignificantDigits: 6 });

// ---------- Data helpers ----------

export const usersAll = () => sql<UserRow[]>`select id, wallet, rep, alerts, telegram_chat_id from users`;

async function userByChat(chatId: number): Promise<UserRow | null> {
  const [u] = await sql<UserRow[]>`select id, wallet, rep, alerts, telegram_chat_id from users where telegram_chat_id = ${chatId}`;
  return u ?? null;
}

async function patchAlerts(userId: string, patch: Partial<Alerts>) {
  await sql`update users set alerts = alerts || ${sql.json(patch as never)} where id = ${userId}`;
}

export function isMuted(a: Alerts, alert: Alert): boolean {
  if (alert.critical) return false;
  if (a.mutedUntil && new Date(a.mutedUntil).getTime() > Date.now()) return true;
  return Boolean(alert.coin && (alert.kind === "move" || alert.kind === "crowded") && a.mutedCoins?.includes(alert.coin));
}

// ---------- Message building ----------

export function alertMessage(a: Alert): { text: string; keyboard: InlineKeyboard } {
  const text = [
    `${stars(a.stars)}  <b>${esc(a.tag)}</b>`,
    `<b>${esc(a.headline)}</b>`,
    "",
    ...a.lines.map(esc),
    ...(a.tip ? ["", `<i>${esc(a.tip)}</i>`] : []),
  ].join("\n");

  const kb = new InlineKeyboard().url(a.kind === "heat" ? "Open my jobs" : a.kind === "event" ? "All events" : "Open SaqBot", APP_URL() + a.path);
  if (a.coin && (a.kind === "move" || a.kind === "crowded")) kb.text(`Mute ${a.coin}`, `mc:${a.coin}`);
  else if (!a.critical) kb.text("Mute 1h", "m:1");
  return { text, keyboard: kb };
}

function settingsText(u: UserRow): string {
  const a = u.alerts;
  const on = (v: boolean | undefined, dflt = true) => ((v ?? dflt) ? "✅" : "⬜️");
  const muted = a.mutedUntil && new Date(a.mutedUntil).getTime() > Date.now()
    ? `\n🔕 Muted until ${new Date(a.mutedUntil).toUTCString().slice(17, 22)} UTC (liquidation warnings still come through)`
    : "";
  const rank = u.rep ? REPS[u.rep].rank : "Not set";
  return [
    "<b>Your SaqBot tip-offs</b>",
    `Rep: ${esc(rank)}`,
    "",
    `${on(a.events)} 5-star events`,
    `${on(a.moves)} Big moves`,
    `${on(a.crowded, false)} Crowded trades`,
    ...(u.rep !== "lookout" ? [`${on(a.heat)} Heat on your jobs`] : []),
    "",
    `Watching: ${(a.watchlist ?? DEFAULT_WATCHLIST).join(", ") || "nothing yet"}`,
    ...(a.mutedCoins?.length ? [`Muted coins: ${a.mutedCoins.join(", ")}`] : []),
    muted,
    "",
    "Tap to switch alerts on or off. Changes sync with the app.",
  ].join("\n");
}

function settingsKeyboard(u: UserRow): InlineKeyboard {
  const a = u.alerts;
  const t = (label: string, key: keyof Alerts, dflt = true) => `${(a[key] ?? dflt) ? "✅" : "⬜️"} ${label}`;
  const kb = new InlineKeyboard()
    .text(t("Events", "events"), "t:events")
    .text(t("Big moves", "moves"), "t:moves")
    .row()
    .text(t("Crowded", "crowded", false), "t:crowded");
  if (u.rep !== "lookout") kb.text(t("Job heat", "heat"), "t:heat");
  kb.row().text("👀 Watchlist", "wl").text("📅 Events", "ev").row();
  const muted = a.mutedUntil && new Date(a.mutedUntil).getTime() > Date.now();
  if (muted) kb.text("🔔 Unmute", "m:0");
  else kb.text("🔕 Mute 1h", "m:1").text("🔕 Mute 8h", "m:8");
  return kb.row().text("🧪 Send a test alert", "test").row().url("Open SaqBot", `${APP_URL()}/alerts`);
}

async function watchlistKeyboard(u: UserRow): Promise<InlineKeyboard> {
  const list = u.alerts.watchlist ?? DEFAULT_WATCHLIST;
  const top = (await getMarkets()).slice(0, 15).map((m) => m.name);
  const coins = Array.from(new Set([...list, ...top])).slice(0, 18);
  const kb = new InlineKeyboard();
  coins.forEach((c, i) => {
    kb.text(`${list.includes(c) ? "✅" : "▫️"} ${c}`, `w:${c}`);
    if (i % 3 === 2) kb.row();
  });
  return kb.row().text("⬅️ Back to settings", "menu");
}

async function eventsText(): Promise<string> {
  const rows = await sql<{ title: string; detail: string | null; starts_at: Date; stars: number | null; type: EventType }[]>`
    select e.title, e.detail, e.starts_at, e.type, r.stars from market_events e left join event_ratings r on r.type = e.type
    where e.starts_at > now() and e.starts_at < now() + interval '7 days' order by e.starts_at limit 12`;
  if (rows.length === 0) return "📅 <b>Upcoming 5-star events</b>\n\nNothing big scheduled this week. Quiet streets.";
  const lines = rows.map((r) => {
    const s = r.stars ?? EVENT_TYPES[r.type]?.fallbackStars ?? 2;
    const when = r.starts_at.toUTCString().replace(/:\d\d GMT$/, " UTC").replace(/ \d{4}/, "");
    return `${stars(s)}\n<b>${esc(r.title)}</b>${r.detail ? `, ${esc(r.detail)}` : ""}\n${when}`;
  });
  return `📅 <b>Upcoming 5-star events</b>\n\n${lines.join("\n\n")}\n\n<i>Stars show how hard BTC has moved around past events of each type. They say how loud it gets, not which way.</i>`;
}

async function jobsText(u: UserRow): Promise<string> {
  if (!u.wallet) return "You haven't started trading on SaqBot yet, so there are no jobs to watch.";
  const [state, mids] = await Promise.all([getAccountState(u.wallet as `0x${string}`), getMids()]);
  if (state.positions.length === 0) return `<b>No active jobs.</b>\nStash: $${state.accountValue.toFixed(2)}`;
  const lines = state.positions.map((p) => {
    const mark = mids[p.coin] ?? p.entryPx;
    const lvl = positionWantedLevel(mark, p.liqPx, p.stopPx, p.leverage);
    const pnl = `${p.unrealizedPnl >= 0 ? "+" : "−"}$${Math.abs(p.unrealizedPnl).toFixed(2)}`;
    return `${stars(lvl)}\n<b>${p.coin} ${p.side}, ${p.leverage}x</b>  ${pnl}\nStop ${p.stopPx ? fmtPx(p.stopPx) : "none (full send)"}  •  Liq ${p.liqPx ? fmtPx(p.liqPx) : "n/a"}`;
  });
  return `<b>Active jobs</b>\n\n${lines.join("\n\n")}\n\nStash: $${state.accountValue.toFixed(2)}`;
}

const SAMPLE: Alert = {
  kind: "heat",
  stars: 4,
  tag: "TEST ALERT",
  headline: "This is what a heat alert looks like",
  lines: ["ETH long is 0.8% from your stop at 3,412.", "If it hits, the loss stays what you planned."],
  tip: "Real alerts come with a button to open the job in SaqBot.",
  path: "/jobs",
};

// ---------- Bot ----------

const COMMANDS = [
  { command: "menu", description: "Your alert settings" },
  { command: "jobs", description: "Heat check on your active jobs" },
  { command: "events", description: "5-star events this week" },
  { command: "watchlist", description: "Pick the coins you watch" },
  { command: "mute", description: "Pause alerts for an hour (or /mute 8)" },
  { command: "test", description: "Send yourself a sample alert" },
  { command: "help", description: "What SaqBot does" },
  { command: "stop", description: "Unlink this chat" },
];

const HELP = [
  "<b>SaqBot: the 5-Star Cheat Code</b>",
  "",
  "I tip you off when it matters:",
  "🚨 <b>Job heat</b>: price closing in on your stop or liquidation",
  "📈 <b>Big moves</b>: sharp runs on unusual volume",
  "🧲 <b>Crowded trades</b>: one side paying heavy funding to stay in",
  "📅 <b>5-star events</b>: Fed decisions, CPI, jobs reports and more",
  "",
  "/menu settings  •  /jobs  •  /events  •  /watchlist  •  /mute  •  /test",
  "",
  "I'm read-only. I can't trade or move money, and I'll never ask for your seed phrase or keys.",
].join("\n");

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  /** Runs a handler for linked chats, or explains how to link. */
  const linked = (fn: (ctx: Context, u: UserRow) => Promise<unknown>) => async (ctx: Context) => {
    const u = ctx.chat ? await userByChat(ctx.chat.id) : null;
    if (!u) {
      const kb = new InlineKeyboard().url("Open SaqBot alerts", `${APP_URL()}/alerts`);
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: "Link this chat in the SaqBot app first." });
      return ctx.reply("This chat isn't linked yet. In SaqBot, go to <b>Alerts</b>, switch on <b>Telegram</b> and tap the link.", { parse_mode: "HTML", reply_markup: kb });
    }
    return fn(ctx, u);
  };

  const showMenu = async (ctx: Context, u: UserRow, edit = false) => {
    const opts = { parse_mode: "HTML" as const, reply_markup: settingsKeyboard(u) };
    if (edit && ctx.callbackQuery) return ctx.editMessageText(settingsText(u), opts).catch(() => undefined);
    return ctx.reply(settingsText(u), opts);
  };

  bot.command("start", async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      const u = await userByChat(ctx.chat.id);
      if (u) return showMenu(ctx, u);
      return ctx.reply(`${HELP}\n\nTo start, open SaqBot, go to <b>Alerts</b> and switch on <b>Telegram</b>.`, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("Open SaqBot alerts", `${APP_URL()}/alerts`),
      });
    }
    const [link] = await sql<{ user_id: string }[]>`
      delete from telegram_links where code = ${code} and expires_at > now() returning user_id`;
    if (!link) {
      return ctx.reply("That link expired. In SaqBot, go to <b>Alerts</b> and tap <b>Open Telegram</b> again.", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("Open SaqBot alerts", `${APP_URL()}/alerts`),
      });
    }
    await sql`update users set telegram_chat_id = null where telegram_chat_id = ${ctx.chat.id}`;
    await sql`update users set telegram_chat_id = ${ctx.chat.id}, alerts = alerts || '{"telegram": true}'::jsonb where id = ${link.user_id}`;
    const u = await userByChat(ctx.chat.id);
    await ctx.reply(
      "🤝 <b>You're in the crew.</b>\nThis chat is linked to your SaqBot account. Here's what I'll tip you off about. Tap any switch to change it.",
      { parse_mode: "HTML" },
    );
    if (u) await showMenu(ctx, u);
    const { text, keyboard } = alertMessage(SAMPLE);
    return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  });

  bot.command(["menu", "settings"], linked((ctx, u) => showMenu(ctx, u)));
  bot.command("help", (ctx) => ctx.reply(HELP, { parse_mode: "HTML" }));
  bot.command("events", async (ctx) => ctx.reply(await eventsText(), { parse_mode: "HTML" }));
  bot.command("jobs", linked(async (ctx, u) => ctx.reply(await jobsText(u), { parse_mode: "HTML", reply_markup: new InlineKeyboard().url("Open my jobs", `${APP_URL()}/jobs`) })));
  bot.command("watchlist", linked(async (ctx, u) => ctx.reply("👀 <b>Your watchlist</b>\nTap coins to add or remove them.", { parse_mode: "HTML", reply_markup: await watchlistKeyboard(u) })));
  bot.command("test", linked(async (ctx) => {
    const { text, keyboard } = alertMessage(SAMPLE);
    return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }));
  bot.command("mute", linked(async (ctx, u) => {
    const hours = Math.min(72, Math.max(1, Number(ctx.match) || 1));
    await patchAlerts(u.id, { mutedUntil: new Date(Date.now() + hours * 3_600_000).toISOString() });
    return ctx.reply(`🔕 Muted for ${hours}h. Liquidation warnings still come through. Send /menu to unmute.`);
  }));
  bot.command("stop", async (ctx) => {
    await sql`update users set telegram_chat_id = null, alerts = alerts || '{"telegram": false}'::jsonb where telegram_chat_id = ${ctx.chat.id}`;
    return ctx.reply("Unlinked. No more alerts here. You can relink anytime from Alerts in the SaqBot app.");
  });

  bot.on("callback_query:data", linked(async (ctx, u) => {
    const data = ctx.callbackQuery!.data!;
    const [kind, arg] = data.split(":");
    if (kind === "t" && ["events", "moves", "crowded", "heat"].includes(arg)) {
      const key = arg as "events" | "moves" | "crowded" | "heat";
      const next = !(u.alerts[key] ?? key !== "crowded");
      await patchAlerts(u.id, { [key]: next });
      u.alerts[key] = next;
      await ctx.answerCallbackQuery({ text: next ? "Switched on" : "Switched off" });
      return showMenu(ctx, u, true);
    }
    if (kind === "m") {
      const hours = Number(arg);
      const mutedUntil = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
      await patchAlerts(u.id, { mutedUntil });
      u.alerts.mutedUntil = mutedUntil;
      await ctx.answerCallbackQuery({ text: hours > 0 ? `Muted for ${hours}h` : "Alerts back on" });
      return ctx.callbackQuery!.message?.text?.includes("Your SaqBot tip-offs") ? showMenu(ctx, u, true) : undefined;
    }
    if (kind === "mc" && arg) {
      const mutedCoins = Array.from(new Set([...(u.alerts.mutedCoins ?? []), arg]));
      await patchAlerts(u.id, { mutedCoins });
      return ctx.answerCallbackQuery({ text: `${arg} market alerts muted. Unmute from /watchlist.` });
    }
    if (kind === "w" && arg) {
      const list = u.alerts.watchlist ?? DEFAULT_WATCHLIST;
      const watchlist = list.includes(arg) ? list.filter((c) => c !== arg) : [...list, arg];
      const mutedCoins = (u.alerts.mutedCoins ?? []).filter((c) => c !== arg);
      await patchAlerts(u.id, { watchlist, mutedCoins });
      u.alerts.watchlist = watchlist;
      u.alerts.mutedCoins = mutedCoins;
      await ctx.answerCallbackQuery({ text: watchlist.includes(arg) ? `Watching ${arg}` : `Stopped watching ${arg}` });
      return ctx.editMessageReplyMarkup({ reply_markup: await watchlistKeyboard(u) }).catch(() => undefined);
    }
    if (kind === "wl") {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText("👀 <b>Your watchlist</b>\nTap coins to add or remove them.", { parse_mode: "HTML", reply_markup: await watchlistKeyboard(u) }).catch(() => undefined);
    }
    if (kind === "menu") {
      await ctx.answerCallbackQuery();
      return showMenu(ctx, u, true);
    }
    if (kind === "ev") {
      await ctx.answerCallbackQuery();
      return ctx.reply(await eventsText(), { parse_mode: "HTML" });
    }
    if (kind === "test") {
      await ctx.answerCallbackQuery({ text: "Sending a test alert" });
      const { text, keyboard } = alertMessage(SAMPLE);
      return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
    return ctx.answerCallbackQuery();
  }));

  bot.catch((err) => console.error("Bot error", err));
  return bot;
}

/** Sets the command menu and profile text, so BotFather setup isn't needed for these. */
export async function configureBot(bot: Bot) {
  await bot.api.setMyCommands(COMMANDS);
  await bot.api.setMyShortDescription("Heat alerts, big moves and 5-star events for Hyperliquid traders. Read-only. Never asks for keys.");
  await bot.api.setMyDescription(
    "SaqBot tips you off before the heat shows up: warnings when your jobs near a stop or liquidation, big market moves, crowded trades and 5-star events like Fed decisions and CPI.\n\nLink me from Alerts in the SaqBot app. I'm read-only and will never ask for your seed phrase or keys.",
  );
}
