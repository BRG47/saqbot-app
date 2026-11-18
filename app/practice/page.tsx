"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { px } from "../../components/ui";
import { usePractice } from "../../lib/client/practice";
import { useSaqbot } from "../../lib/client/saqbot";
import { buildPlan, type Side } from "../../lib/planner";

type Stop = "tight" | "normal" | "wide";
type Choice = { coin: string; side: Side; leverage: number; stop: Stop; risk: string };

/** Practice runs let you pick leverage in this range (capped at the market's own max). */
const MIN_LEV = 3;
const MAX_LEV = 10;
/** Coins shown as quick picks; every other market is in the dropdown. */
const QUICK_PICKS = 8;

const OPTION_STEPS = {
  side: (coin: string) => ({
    heading: `Which way do you think ${coin} moves?`,
    coach: "Long means you profit if the price rises. Short means you profit if it falls. There's no wrong answer in practice. The point is to see how the rest of the plan follows from it.",
    options: [["long", "Long", `Profit if ${coin} goes up`], ["short", "Short", `Profit if ${coin} goes down`]],
  }),
  stop: () => ({
    heading: "Where do you admit you were wrong?",
    coach: "Your stop-loss closes the job automatically at a set price. Tight stops allow a bigger position for the same risk, but everyday price wiggles hit them more often.",
    options: [["tight", "Tight, 1% away", "Bigger position, stopped out more often"], ["normal", "Normal, 2% away", "A balanced starting point"], ["wide", "Wide, 4% away", "Smaller position, more room to move"]],
  }),
  risk: () => ({
    heading: "How much are you willing to lose?",
    coach: "Pick this first and let SaqBot size the job around it. Many traders keep each job to a small slice of their stash so one bad call never wipes them out.",
    options: [["5", "$5", "Half a percent of your practice stash"], ["10", "$10", "1% of your practice stash"], ["25", "$25", "2.5% of your practice stash"]],
  }),
} as const;

const STEPS = ["coin", "side", "leverage", "stop", "risk"] as const;
const TOTAL = STEPS.length + 1;

export default function Practice() {
  const router = useRouter();
  const { markets, updatePrefs, authenticated } = useSaqbot();
  const practice = usePractice();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice>({ coin: "BTC", side: "long", leverage: MIN_LEV, stop: "normal", risk: "10" });
  const [error, setError] = useState<string | null>(null);

  const market = markets.find((m) => m.name === choice.coin);
  const maxLev = Math.max(1, Math.min(MAX_LEV, market?.maxLeverage ?? MAX_LEV));
  const minLev = Math.min(MIN_LEV, maxLev);
  const leverage = Math.max(minLev, Math.min(choice.leverage, maxLev));
  const last = step === STEPS.length;
  const plan = market
    ? buildPlan({ side: choice.side, entry: market.markPx, stopStyle: choice.stop, amountUsd: Number(choice.risk), leverage, marketMaxLeverage: market.maxLeverage, fundingHourly: market.funding, holdHours: 24, accountValue: practice.state?.cash ?? null })
    : null;

  function run() {
    if (!market || !plan?.ok) return setError(plan?.errors[0] ?? `Waiting for ${choice.coin}'s price.`);
    try {
      practice.open({ coin: market.name, side: choice.side, size: plan.size, entryPx: market.markPx, leverage, stopPx: plan.stop, tpPx: null, marketMaxLeverage: market.maxLeverage });
      updatePrefs({ mode: "practice" });
      router.push("/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const kind = STEPS[step];
  const optionStep = kind === "side" || kind === "stop" || kind === "risk" ? OPTION_STEPS[kind](choice.coin) : null;

  return (
    <>
      <div className="practice-band" style={{ paddingTop: "calc(10px + env(safe-area-inset-top, 0px))" }}>
        <span>Practice run</span>
        <span style={{ fontWeight: 500 }}>$1,000 fake cash, real prices</span>
      </div>
      <main className="screen">
        <div className="row">
          <Link href={authenticated ? "/home" : "/"} className="icon-btn" aria-label="Leave practice">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </Link>
          <h1 className="display h2" style={{ flex: 1 }}>Your first job</h1>
          <span className="small">Step {Math.min(step + 1, TOTAL)} of {TOTAL}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${TOTAL}, minmax(0, 1fr))`, gap: 8 }} aria-hidden="true">
          {Array.from({ length: TOTAL }, (_, i) => <div key={i} style={{ height: 4, borderRadius: 2, background: i <= step ? "var(--amber)" : "var(--line)" }} />)}
        </div>

        {kind === "coin" && (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>Pick your target.</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>Choose the market for this job. The busiest markets are up top. Prices are live from Hyperliquid.</p>
            </div>
            <div className="chips" role="radiogroup" aria-label="Market">
              {markets.slice(0, QUICK_PICKS).map((m) => (
                <button key={m.name} type="button" role="radio" aria-checked={choice.coin === m.name} aria-pressed={choice.coin === m.name} className="chip" onClick={() => setChoice({ ...choice, coin: m.name })}>
                  {m.name}
                </button>
              ))}
            </div>
            <label className="field">
              Or pick any market
              <select value={choice.coin} onChange={(e) => setChoice({ ...choice, coin: e.target.value })}>
                {markets.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
            {market && <p className="small">{market.name} is at <b className="num" style={{ color: "var(--ink)" }}>{px(market.markPx)}</b> right now.</p>}
          </>
        )}

        {kind === "leverage" && (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>How fast is the getaway car?</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>
                Leverage multiplies every price move on the money you put up. At {leverage}x, a 1% move in {choice.coin} is a {leverage}% move on your margin, in both directions. Higher leverage also puts liquidation closer.
              </p>
            </div>
            <label className="field">
              <span className="row">
                <span>Leverage <b style={{ color: "var(--ink)" }}>{leverage}x</b></span>
                <span className="tiny">{minLev}x to {maxLev}x{maxLev < MAX_LEV ? ` (${choice.coin}'s max)` : ""}</span>
              </span>
              <input type="range" min={minLev} max={maxLev} step={1} value={leverage} disabled={minLev === maxLev} onChange={(e) => setChoice({ ...choice, leverage: Number(e.target.value) })} />
            </label>
            {plan && plan.liqPx > 0 && (
              <p className="small">
                At {leverage}x, liquidation is about <b className="warn">{((Math.abs(market!.markPx - plan.liqPx) / market!.markPx) * 100).toFixed(1)}%</b> away from your entry.
              </p>
            )}
          </>
        )}

        {optionStep && kind !== "coin" && kind !== "leverage" && (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>{optionStep.heading}</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>{optionStep.coach}</p>
            </div>
            <div className="stack" role="radiogroup" aria-label={optionStep.heading}>
              {optionStep.options.map(([id, label, sub]) => (
                <button key={id} type="button" role="radio" aria-checked={choice[kind] === id} className="choice wide" onClick={() => setChoice({ ...choice, [kind]: id })}>
                  {label}
                  <small>{sub}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {last && (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>Here&apos;s your plan.</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>SaqBot sized the position so hitting your stop costs exactly what you chose. The stop goes out together with the entry, so the job is never unprotected.</p>
            </div>
            {plan && (
              <div className="panel" style={{ gap: 0 }}>
                <div className="list-row"><span className="small">Job</span><strong>{choice.side === "long" ? "Long" : "Short"} {choice.coin} at {leverage}x</strong></div>
                <div className="list-row"><span className="small">Stop-loss</span><strong className="down">{choice.stop === "tight" ? 1 : choice.stop === "normal" ? 2 : 4}% from entry</strong></div>
                <div className="list-row"><span className="small">If the stop hits</span><strong>You lose ${choice.risk}</strong></div>
                <div className="list-row"><span className="small">Position value</span><strong>${Math.round(plan.notional).toLocaleString("en-US")}</strong></div>
                <div className="list-row"><span className="small">Liquidation</span><strong className="warn">{px(plan.liqPx)}</strong></div>
              </div>
            )}
          </>
        )}
        {error && <p className="notice notice-error">{error}</p>}
        <div className="spacer" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => { setError(null); setStep(Math.max(0, step - 1)); }}>Back</button>
          <button className="btn btn-amber" onClick={() => (last ? run() : setStep(step + 1))}>{last ? "Run the practice job" : "Next"}</button>
        </div>
      </main>
    </>
  );
}
