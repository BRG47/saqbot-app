"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Band, ModeSwitch, Stars, TabBar, Wasted, Tip, px, usd, useRequireSignIn } from "../../components/ui";
import { usePractice } from "../../lib/client/practice";
import { useSaqbot } from "../../lib/client/saqbot";
import { BUILDER_FEE, feeLabel } from "../../lib/config";
import { getTodayPnl } from "../../lib/hyperliquid";
import { placeJob } from "../../lib/orders";
import { buildPlan, STOP_PRESETS, type Side, type StopStyle } from "../../lib/planner";
import { REPS } from "../../lib/rep";
import { RESTRICTED_MESSAGE } from "../../lib/client/geo";

const AMOUNTS = [5, 10, 25];
/** Take-profit slider range, in percent from entry. 0 means no take-profit. */
const TP_MAX_PCT = 25;
const TP_STEP_PCT = 0.5;

export default function PlanPage() {
  const signedIn = useRequireSignIn();
  const router = useRouter();
  const { prefs, markets, account, agent, fee, refetchAccount, address, geoRestricted } = useSaqbot();
  const practice = usePractice();
  const rep = REPS[prefs.rep ?? "novice"];
  const live = prefs.mode === "live";

  const [coin, setCoin] = useState("BTC");
  const [side, setSide] = useState<Side>("long");
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [stopStyle, setStopStyle] = useState<StopStyle>("normal");
  const [customStop, setCustomStop] = useState("");
  const [tpPct, setTpPct] = useState(0);
  const [tpExact, setTpExact] = useState(false);
  const [customTp, setCustomTp] = useState("");
  const [leverage, setLeverage] = useState(rep.suggestedLeverage);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const market = markets.find((m) => m.name === coin) ?? markets[0];
  useEffect(() => {
    if (market) setLeverage((l) => Math.min(l, market.maxLeverage));
  }, [market]);

  const today = useQuery({
    queryKey: ["todayPnl", address],
    enabled: live && Boolean(address) && prefs.dailyLossLimit !== null,
    queryFn: () => getTodayPnl(address!),
    refetchInterval: 60_000,
  });
  const limitHit = live && prefs.dailyLossLimit !== null && (today.data ?? 0) <= -prefs.dailyLossLimit;

  const amt = customAmount ? Number(customAmount) : amount;
  const fullSend = stopStyle === "none";
  const plan = useMemo(() => {
    if (!market) return null;
    const dir = side === "long" ? 1 : -1;
    const takeProfit = tpExact ? Number(customTp) : tpPct > 0 ? market.markPx * (1 + (dir * tpPct) / 100) : 0;
    const practiceValue = practice.state ? practice.state.cash : null;
    return buildPlan({
      side,
      entry: market.markPx,
      stopStyle,
      customStop: Number(customStop),
      takeProfit,
      amountUsd: amt,
      leverage,
      marketMaxLeverage: market.maxLeverage,
      fundingHourly: market.funding,
      holdHours: 24,
      accountValue: live ? account?.accountValue ?? null : practiceValue,
    });
  }, [market, side, stopStyle, customStop, tpPct, tpExact, customTp, amt, leverage, live, account, practice.state]);

  if (!signedIn) return null;
  if (!market || !plan) return <p className="screen">Loading markets…</p>;

  const liqOff = Math.abs(market.markPx - plan.liqPx) / market.markPx;
  const stopOff = plan.stop ? Math.abs(market.markPx - plan.stop) / market.markPx : liqOff;
  const stopPos = `${Math.max(4, Math.min(100, (stopOff / liqOff) * 100)).toFixed(1)}%`;
  const builderFee = fee?.fee ?? BUILDER_FEE;

  async function execute() {
    if (!plan?.ok || !market) return;
    setBusy(true);
    setError(null);
    try {
      if (live) {
        if (geoRestricted) throw new Error(RESTRICTED_MESSAGE);
        if (!agent) throw new Error("Start a trading session first.");
        await placeJob(agent, { market, side, size: plan.size, leverage, stop: plan.stop, takeProfit: plan.takeProfit, builderFee });
        refetchAccount();
      } else {
        practice.open({ coin: market.name, side, size: plan.size, entryPx: market.markPx, leverage, stopPx: plan.stop, tpPx: plan.takeProfit, marketMaxLeverage: market.maxLeverage });
      }
      router.push("/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Band title="Plan the job" back="/home" right={<ModeSwitch />} />
      {!live && <div className="practice-band"><span>Practice run</span><span style={{ fontWeight: 500 }}>Fake cash, real prices</span></div>}
      <main className="screen">
        <label className="field">
          Market
          <select value={market.name} onChange={(e) => setCoin(e.target.value)}>
            {markets.slice(0, 60).map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>
        <p className="small" style={{ marginTop: -8 }}>Enters at market, about <b className="num">{px(market.markPx)}</b></p>

        <div className="grid2">
          {(["long", "short"] as const).map((s) => (
            <button key={s} type="button" className={`choice ${s}`} aria-pressed={side === s} onClick={() => setSide(s)}>
              {s === "long" ? "Long" : "Short"}
            </button>
          ))}
        </div>

        <div className="stack">
          <span className="small">{fullSend ? "Margin I'll put in (all of it is at risk)" : "Most I'll lose on this job"}</span>
          <div className="grid4">
            {AMOUNTS.map((a) => (
              <button key={a} type="button" className="choice" aria-pressed={!customAmount && amount === a} onClick={() => { setAmount(a); setCustomAmount(""); }}>
                ${a}
              </button>
            ))}
            <input aria-label="Other amount" inputMode="decimal" placeholder="Other" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} style={{ minWidth: 0, borderRadius: 10, border: "1px solid var(--line-strong)", padding: "0 10px", font: "inherit", fontWeight: 600 }} />
          </div>
        </div>

        <div className="stack">
          <span className="small">Getaway route (stop-loss)</span>
          <div className="grid2">
            {(Object.keys(STOP_PRESETS) as (keyof typeof STOP_PRESETS)[]).map((k) => (
              <button key={k} type="button" className="choice" aria-pressed={stopStyle === k} onClick={() => setStopStyle(k)}>
                {k[0].toUpperCase() + k.slice(1)}
                <small>{STOP_PRESETS[k] * 100}% away</small>
              </button>
            ))}
            <button type="button" className="choice danger" aria-pressed={fullSend} onClick={() => setStopStyle("none")}>
              Full send<small>No stop-loss</small>
            </button>
            {rep.customPrices && (
              <button type="button" className="choice" aria-pressed={stopStyle === "custom"} onClick={() => setStopStyle("custom")}>
                Exact price<small>Type your stop</small>
              </button>
            )}
          </div>
          {stopStyle === "custom" && (
            <input className="field" aria-label="Stop price" inputMode="decimal" placeholder={px(market.markPx * (side === "long" ? 0.98 : 1.02))} value={customStop} onChange={(e) => setCustomStop(e.target.value)} style={{ font: "inherit", fontSize: 17, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line-strong)" }} />
          )}
          {fullSend ? (
            <p className="small down" style={{ fontWeight: 600 }}>Full send: no stop-loss. If price reaches liquidation, the whole margin on this job is gone.</p>
          ) : (
            <Tip>Tighter stops mean a bigger position for the same risk, but normal price wiggles hit them more often.</Tip>
          )}
        </div>

        <div className="stack">
          {tpExact ? (
            <>
              <span className="row">
                <span className="small">Take-profit price</span>
                <button type="button" className="btn-text tiny" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => setTpExact(false)}>Use the slider</button>
              </span>
              <input aria-label="Take-profit price" inputMode="decimal" value={customTp} onChange={(e) => setCustomTp(e.target.value)} style={{ font: "inherit", fontSize: 17, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line-strong)" }} />
            </>
          ) : (
            <label className="field">
              <span className="row">
                <span>
                  Take-profit <b style={{ color: tpPct > 0 ? "var(--up)" : "var(--ink)" }}>{tpPct > 0 ? `+${tpPct}%` : "None"}</b>
                </span>
                <span className="tiny">
                  {tpPct > 0 && plan.takeProfit ? `${px(plan.takeProfit)}, about +${usd(plan.size * Math.abs(plan.takeProfit - market.markPx))}` : "Slide to set one"}
                </span>
              </span>
              <input type="range" min={0} max={TP_MAX_PCT} step={TP_STEP_PCT} value={tpPct} onChange={(e) => setTpPct(Number(e.target.value))} aria-valuetext={tpPct > 0 ? `${tpPct}% from entry` : "No take-profit"} />
              {rep.customPrices && (
                <button type="button" className="btn-text tiny" style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, cursor: "pointer" }} onClick={() => setTpExact(true)}>Type an exact price instead</button>
              )}
            </label>
          )}
        </div>

        <label className="field">
          <span className="row">
            <span>Leverage <b style={{ color: "var(--ink)" }}>{leverage}x</b></span>
            <span className="tiny">Suggested {rep.suggestedLeverage}x, max {market.maxLeverage}x</span>
          </span>
          <input type="range" min={1} max={market.maxLeverage} step={1} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} />
        </label>

        <div className="panel">
          <div className="row">
            <strong className="display" style={{ fontSize: 22 }}>
              {side === "long" ? "Long" : "Short"} {market.name}, {fullSend ? "full send" : `risking ${usd(amt || 0)}`}
            </strong>
            <Stars level={plan.wantedLevel} size={16} />
          </div>
          <div className="bar" aria-hidden="true">
            <div className="track" />
            <div className="fill" style={{ width: stopPos }} />
            <div className="tick" style={{ left: 0, background: "var(--ink)" }} />
            <div className="tick" style={{ left: `calc(${stopPos} - 3px)`, background: "var(--down)" }} />
            <div className="tick" style={{ right: 0, background: "var(--amber)" }} />
          </div>
          <div className="figures">
            <span>Entry<b>{px(market.markPx)}</b></span>
            <span style={{ textAlign: "center" }}><span className="down">Stop</span><b>{px(plan.stop)}</b></span>
            <span style={{ textAlign: "right" }}><span className="warn">Liquidation</span><b>{px(plan.liqPx)}</b></span>
          </div>
          <div className="figures" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <span>Position<b>{usd(plan.notional)}</b></span>
            <span>Margin<b>{usd(plan.margin)}</b></span>
            <span>Funding 24h<b>{plan.fundingCost >= 0 ? usd(plan.fundingCost) : `+${usd(-plan.fundingCost)}`}</b></span>
          </div>
        </div>

        {plan.errors.length > 0 && <div className="notice notice-error"><ul>{plan.errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
        {plan.ok && plan.warnings.length > 0 && <div className="notice notice-warn"><ul>{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
        {limitHit && (
          <p className="notice notice-error">You hit your daily loss limit of {usd(prefs.dailyLossLimit!)}. Lay low until tomorrow, or change the limit in Alerts.</p>
        )}

        {live && geoRestricted ? (
          <p className="notice notice-warn">{RESTRICTED_MESSAGE} Switch to Practice to run this job with fake cash.</p>
        ) : live && !agent ? (
          <a className="btn" href="/fund">Start a trading session</a>
        ) : (
          <button className="btn" disabled={!plan.ok || limitHit} onClick={() => setReviewing(true)}>Go over the plan</button>
        )}
        {error && !reviewing && <p className="notice notice-error">{error}</p>}
      </main>
      <TabBar />
      {!live && <Wasted events={practice.lastClosed} />}

      {reviewing && (
        <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Before the job" onClick={() => !busy && setReviewing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="display h1">Before the job</h2>
            <div className="panel" style={{ gap: 2 }}>
              <span className="small">{fullSend ? "If price hits liquidation, you lose" : "If your stop is hit, you lose about"}</span>
              <span className="display down num" style={{ fontSize: 52 }}>{usd(plan.maxLoss)}</span>
              <span className="small">
                plus fees.{(live ? account?.accountValue : practice.state?.cash) ? ` That's ${((plan.maxLoss / ((live ? account?.accountValue : practice.state?.cash) || 1)) * 100).toFixed(1)}% of your stash.` : ""}
              </span>
            </div>
            <div>
              {[
                ["Job", `${side === "long" ? "Long" : "Short"} ${market.name} at ${leverage}x`],
                ["Enters at about", px(market.markPx)],
                ["Getaway (stop-loss)", plan.stop ? px(plan.stop) : "None, full send"],
                ["Take-profit", px(plan.takeProfit)],
                ["Position value", usd(plan.notional)],
                ["Estimated liquidation", px(plan.liqPx)],
                ["SaqBot fee", live ? (builderFee === 0 ? "0% (BAWSAQ holder)" : feeLabel(builderFee)) : "None in practice"],
              ].map(([k, v]) => (
                <div key={k} className="list-row"><span className="small">{k}</span><strong className="num">{v}</strong></div>
              ))}
            </div>
            <p className={`notice ${fullSend ? "notice-error" : "notice-ok"}`}>
              {fullSend
                ? "Full send: nothing closes this job early except you, a take-profit, or liquidation."
                : "Your getaway is locked in with your entry and stays active on Hyperliquid even if you close SaqBot."}
            </p>
            {error && <p className="notice notice-error">{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button className="btn btn-quiet" disabled={busy} onClick={() => setReviewing(false)}>Edit</button>
              <button className={`btn ${fullSend ? "btn-danger" : "btn-go"}`} disabled={busy} onClick={execute}>
                {busy ? "Placing…" : live ? "Start the job" : "Run the practice job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
