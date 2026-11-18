"use client";

import Link from "next/link";
import { EventList } from "../../components/EventList";
import { Band, ModeSwitch, Stars, TabBar, px, signedUsd, usd, useRequireSignIn } from "../../components/ui";
import { usePractice } from "../../lib/client/practice";
import { useSaqbot } from "../../lib/client/saqbot";
import { pnlAt } from "../../lib/practice";
import { positionWantedLevel } from "../../lib/planner";
import { REPS } from "../../lib/rep";

export default function Home() {
  const signedIn = useRequireSignIn();
  const { prefs, account, markets } = useSaqbot();
  const practice = usePractice();
  if (!signedIn) return null;

  const trades = !prefs.rep || REPS[prefs.rep].trades;
  if (!trades) return <LookoutHome />;

  const live = prefs.mode === "live";
  const mark = (coin: string) => markets.find((m) => m.name === coin)?.markPx ?? practice.mids[coin] ?? 0;

  const jobs = live
    ? (account?.positions ?? []).map((p) => ({
        key: p.coin,
        label: `${p.coin} ${p.side}, ${p.leverage}x`,
        sub: p.stopPx ? `Stop set at ${px(p.stopPx)}` : "Full send, no stop",
        pnl: p.unrealizedPnl,
        wanted: positionWantedLevel(mark(p.coin), p.liqPx, p.stopPx, p.leverage),
      }))
    : (practice.state?.open ?? []).map((j) => ({
        key: j.id,
        label: `${j.coin} ${j.side}, ${j.leverage}x`,
        sub: j.stopPx ? `Stop set at ${px(j.stopPx)}` : "Full send, no stop",
        pnl: pnlAt(j, mark(j.coin)),
        wanted: positionWantedLevel(mark(j.coin), j.liqPx, j.stopPx, j.leverage),
      }));

  const balance = live ? account?.accountValue ?? 0 : (practice.state?.cash ?? 0) + (practice.state?.open ?? []).reduce((s, j) => s + j.margin + pnlAt(j, mark(j.coin)), 0);
  const openPnl = jobs.reduce((s, j) => s + j.pnl, 0);
  const wanted = jobs.reduce((m, j) => Math.max(m, j.wanted), 0);
  const hot = jobs.filter((j) => j.wanted >= 4).length;

  return (
    <>
      <Band title="SaqBot" right={<ModeSwitch />} />
      {!live && <div className="practice-band"><span>Practice run</span><span style={{ fontWeight: 500 }}>Fake cash, real prices</span></div>}
      <main className="screen">
        <div className="panel">
          <span className="small">{live ? "Your stash" : "Practice stash"}</span>
          <span className="display num" style={{ fontSize: 48 }}>{usd(balance)}</span>
          {jobs.length > 0 && <span className={openPnl >= 0 ? "up" : "down"}>{signedUsd(openPnl)} on active jobs</span>}
          <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <span className="stack" style={{ gap: 0 }}>
              <span className="small">Wanted level</span>
              <span style={{ fontSize: 15 }}>{hot ? `Heat is rising on ${hot} job${hot > 1 ? "s" : ""}` : jobs.length ? "Streets are calm" : "No active jobs"}</span>
            </span>
            <Stars level={wanted} />
          </div>
          {live && (
            <div className="grid2">
              <Link className="btn btn-quiet btn-sm" href="/fund">Add funds</Link>
              <Link className="btn btn-quiet btn-sm" href="/fund">Withdraw</Link>
            </div>
          )}
        </div>

        <section className="stack">
          <div className="row">
            <h2 className="display h2">Active jobs</h2>
            <Link href="/jobs" style={{ fontSize: 15 }}>See all</Link>
          </div>
          {jobs.length === 0 && <p className="small">Nothing running. Plan a job to get started.</p>}
          {jobs.slice(0, 3).map((j) => (
            <Link key={j.key} href="/jobs" className="panel" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", textDecoration: "none", padding: "12px 14px" }}>
              <span className="stack" style={{ gap: 0 }}>
                <strong>{j.label}</strong>
                <span className={j.wanted >= 4 ? "tiny warn" : "tiny"}>{j.wanted >= 4 ? "Heat's rising" : j.sub}</span>
              </span>
              <strong className={j.pnl >= 0 ? "up num" : "down num"}>{signedUsd(j.pnl)}</strong>
            </Link>
          ))}
        </section>

        {live && (
          <Link href="/practice" className="panel" style={{ border: "1px dashed var(--amber)", textDecoration: "none", gap: 2 }}>
            <strong className="warn">Test the job in a practice run</strong>
            <span className="small">Same streets, fake cash, nothing to lose.</span>
          </Link>
        )}

        <EventList limit={3} />

        <Link className="btn" href="/plan">Plan a job</Link>
      </main>
      <TabBar />
    </>
  );
}

/** Home for Lookouts: market radar and events, no trading. */
function LookoutHome() {
  const { markets } = useSaqbot();
  const top = markets.slice(0, 30);
  const movers = [...top]
    .map((m) => ({ ...m, change: m.prevDayPx ? (m.markPx / m.prevDayPx - 1) * 100 : 0 }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);
  const crowded = [...top].sort((a, b) => Math.abs(b.funding) - Math.abs(a.funding)).slice(0, 3);

  return (
    <>
      <Band title="SaqBot" />
      <main className="screen">
        <h1 className="display h1">The streets today</h1>
        <div className="panel" style={{ gap: 0 }}>
          <h2 className="display" style={{ fontSize: 22, paddingBottom: 4 }}>Biggest moves, 24h</h2>
          {movers.map((m) => (
            <div key={m.name} className="list-row">
              <strong>{m.name}</strong>
              <span className="num">{px(m.markPx)}</span>
              <strong className={m.change >= 0 ? "up num" : "down num"}>{(m.change >= 0 ? "+" : "") + m.change.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
        <div className="panel" style={{ gap: 0 }}>
          <h2 className="display" style={{ fontSize: 22, paddingBottom: 4 }}>Crowded trades</h2>
          {crowded.map((m) => (
            <div key={m.name} className="list-row">
              <strong>{m.name}</strong>
              <span className="small">{m.funding >= 0 ? "Longs paying shorts" : "Shorts paying longs"}</span>
              <span className="num">{(m.funding * 100).toFixed(4)}%/h</span>
            </div>
          ))}
        </div>
        <EventList />
        <Link className="btn btn-quiet" href="/rep">Upgrade to trading</Link>
      </main>
      <TabBar />
    </>
  );
}
