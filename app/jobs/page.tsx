"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceChart } from "../../components/PriceChart";
import { Band, ModeSwitch, Stars, TabBar, Wasted, px, signedUsd, useRequireSignIn } from "../../components/ui";
import { usePractice } from "../../lib/client/practice";
import { useSaqbot } from "../../lib/client/saqbot";
import { BUILDER_FEE } from "../../lib/config";
import type { LivePosition } from "../../lib/hyperliquid";
import { closePosition, moveStop } from "../../lib/orders";
import { positionWantedLevel } from "../../lib/planner";
import { pnlAt } from "../../lib/practice";

type Card = {
  key: string;
  coin: string;
  title: string;
  pnl: number;
  entry: number;
  stop: number | null;
  tp: number | null;
  liq: number | null;
  mark: number;
  wanted: number;
  live?: LivePosition;
};

export default function Jobs() {
  const { prefs, account, markets, agent, fee, refetchAccount } = useSaqbot();
  const signedIn = useRequireSignIn(prefs.mode === "live");
  const practice = usePractice();
  const [editing, setEditing] = useState<string | null>(null);
  const [newStop, setNewStop] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  if (!signedIn) return null;

  const live = prefs.mode === "live";
  const mark = (coin: string) => markets.find((m) => m.name === coin)?.markPx ?? practice.mids[coin] ?? 0;

  const cards: Card[] = live
    ? (account?.positions ?? []).map((p) => ({
        key: p.coin,
        coin: p.coin,
        title: `${p.coin} ${p.side}, ${p.leverage}x`,
        pnl: p.unrealizedPnl,
        entry: p.entryPx,
        stop: p.stopPx,
        tp: p.tpPx,
        liq: p.liqPx,
        mark: mark(p.coin),
        wanted: positionWantedLevel(mark(p.coin), p.liqPx, p.stopPx, p.leverage),
        live: p,
      }))
    : (practice.state?.open ?? []).map((j) => ({
        key: j.id,
        coin: j.coin,
        title: `${j.coin} ${j.side}, ${j.leverage}x`,
        pnl: pnlAt(j, mark(j.coin)),
        entry: j.entryPx,
        stop: j.stopPx,
        tp: j.tpPx,
        liq: j.liqPx,
        mark: mark(j.coin),
        wanted: positionWantedLevel(mark(j.coin), j.liqPx, j.stopPx, j.leverage),
      }));

  async function act(key: string, fn: () => Promise<unknown> | unknown, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      setEditing(null);
      refetchAccount();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message.split("\n")[0] : String(e) });
    } finally {
      setBusy(null);
    }
  }

  function cashOut(c: Card) {
    if (!live) return act(c.key, () => practice.cashOut(c.key, c.coin), "Cashed out of the practice job.");
    const market = markets.find((m) => m.name === c.coin);
    if (!agent || !market || !c.live) return setMsg({ kind: "error", text: "Start a trading session on the Plan screen first." });
    return act(c.key, () => closePosition(agent, market, c.live!, fee?.fee ?? BUILDER_FEE), "Cashed out.");
  }

  function saveStop(c: Card) {
    const market = markets.find((m) => m.name === c.coin);
    if (!agent || !market || !c.live) return setMsg({ kind: "error", text: "Start a trading session on the Plan screen first." });
    return act(c.key, () => moveStop(agent, market, c.live!, Number(newStop)), "Getaway moved.");
  }

  return (
    <>
      <Band title="Active jobs" back="/home" right={<ModeSwitch />} />
      {!live && <div className="practice-band"><span>Practice run</span><span style={{ fontWeight: 500 }}>Fake cash, real prices</span></div>}
      <main className="screen">
        {msg && <p className={`notice notice-${msg.kind}`} role="status">{msg.text}</p>}
        {!live && practice.lastClosed.map((c) => (
          <p key={c.id} className={`notice ${c.pnl >= 0 ? "notice-ok" : "notice-error"}`}>
            {c.reason === "liquidated" && <span className="wasted-badge">WASTED</span>}
            {c.coin} practice job closed by {c.reason === "tp" ? "take-profit" : c.reason}: {signedUsd(c.pnl)}
            {c.reason === "liquidated" ? ". Wasted." : ""}
          </p>
        ))}
        {cards.length === 0 && (
          <div className="panel">
            <strong>No active jobs.</strong>
            <span className="small">Plan one and it shows up here with its getaway and heat level.</span>
            <Link className="btn" href="/plan">Plan a job</Link>
          </div>
        )}
        {cards.map((c) => {
          const nearStop = c.stop && Math.abs(c.mark - c.stop) / c.mark < 0.01;
          return (
            <div key={c.key} className="panel" style={c.wanted >= 4 ? { borderColor: "var(--amber)" } : undefined}>
              <div className="row">
                <strong className="display" style={{ fontSize: 24 }}>{c.title}</strong>
                <Stars level={c.wanted} size={16} />
              </div>
              <div className="row" style={{ justifyContent: "flex-start", alignItems: "baseline" }}>
                <span className={`display num ${c.pnl >= 0 ? "up" : "down"}`} style={{ fontSize: 36 }}>{signedUsd(c.pnl)}</span>
                <span className="small">so far</span>
              </div>
              <div className="figures" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <span>Entry<b>{px(c.entry)}</b></span>
                <span><span className="up">Mark</span><b>{px(c.mark)}</b></span>
                <span><span className="down">Stop</span><b>{c.stop ? px(c.stop) : "Full send"}</b></span>
                <span><span className="warn">Liq.</span><b>{px(c.liq)}</b></span>
              </div>
              <PriceChart
                coin={c.coin}
                mark={c.mark}
                levels={[
                  { label: "Entry", price: c.entry, color: "var(--sage)" },
                  { label: "Stop", price: c.stop, color: "var(--down)" },
                  { label: "TP", price: c.tp, color: "var(--neon)" },
                  { label: "Liq", price: c.liq, color: "var(--amber)" },
                ]}
              />
              {nearStop && <p className="notice notice-warn">Heat's rising: price is {((Math.abs(c.mark - c.stop!) / c.mark) * 100).toFixed(1)}% from your stop.</p>}
              {!c.stop && <p className="notice notice-warn">Full send: liquidation is the only exit unless you cash out.</p>}
              {editing === c.key && (
                <div className="stack">
                  <label className="field">
                    New stop price
                    <input inputMode="decimal" value={newStop} onChange={(e) => setNewStop(e.target.value)} placeholder={px(c.mark)} />
                  </label>
                  <div className="grid2">
                    <button className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="btn btn-sm" disabled={busy !== null || !(Number(newStop) > 0)} onClick={() => saveStop(c)}>Save getaway</button>
                  </div>
                </div>
              )}
              {editing !== c.key && (
                <div className="grid2">
                  {live ? (
                    <button className="btn btn-quiet btn-sm" onClick={() => { setEditing(c.key); setNewStop(c.stop ? String(c.stop) : ""); }}>
                      {c.stop ? "Move stop" : "Add a stop"}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button className="btn btn-sm" disabled={busy !== null} onClick={() => cashOut(c)}>{busy === c.key ? "Cashing out…" : "Cash out"}</button>
                </div>
              )}
            </div>
          );
        })}
        <p className="small">Stops stay active on Hyperliquid while the app is closed. Turn on alerts to hear when a job gets risky.</p>
      </main>
      <TabBar />
      {!live && <Wasted events={practice.lastClosed} />}
    </>
  );
}
