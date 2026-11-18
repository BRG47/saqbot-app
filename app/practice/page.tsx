"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePractice } from "../../lib/client/practice";
import { useSaqbot } from "../../lib/client/saqbot";
import { buildPlan, type Side } from "../../lib/planner";

const STEPS = [
  {
    key: "side",
    heading: "Which way do you think BTC moves?",
    coach: "Long means you profit if the price rises. Short means you profit if it falls. There's no wrong answer in practice. The point is to see how the rest of the plan follows from it.",
    options: [["long", "Long", "Profit if BTC goes up"], ["short", "Short", "Profit if BTC goes down"]],
  },
  {
    key: "stop",
    heading: "Where do you admit you were wrong?",
    coach: "Your stop-loss closes the job automatically at a set price. Tight stops allow a bigger position for the same risk, but everyday price wiggles hit them more often.",
    options: [["tight", "Tight, 1% away", "Bigger position, stopped out more often"], ["normal", "Normal, 2% away", "A balanced starting point"], ["wide", "Wide, 4% away", "Smaller position, more room to move"]],
  },
  {
    key: "risk",
    heading: "How much are you willing to lose?",
    coach: "Pick this first and let SaqBot size the job around it. Many traders keep each job to a small slice of their stash so one bad call never wipes them out.",
    options: [["5", "$5", "Half a percent of your practice stash"], ["10", "$10", "1% of your practice stash"], ["25", "$25", "2.5% of your practice stash"]],
  },
] as const;

export default function Practice() {
  const router = useRouter();
  const { markets, updatePrefs, authenticated } = useSaqbot();
  const practice = usePractice();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<{ side: Side; stop: "tight" | "normal" | "wide"; risk: string }>({ side: "long", stop: "normal", risk: "10" });
  const [error, setError] = useState<string | null>(null);

  const btc = markets.find((m) => m.name === "BTC");
  const last = step === STEPS.length;
  const plan = btc
    ? buildPlan({ side: choice.side, entry: btc.markPx, stopStyle: choice.stop, amountUsd: Number(choice.risk), leverage: 3, marketMaxLeverage: btc.maxLeverage, fundingHourly: btc.funding, holdHours: 24, accountValue: practice.state?.cash ?? null })
    : null;

  function run() {
    if (!btc || !plan?.ok) return setError(plan?.errors[0] ?? "Waiting for BTC's price.");
    try {
      practice.open({ coin: "BTC", side: choice.side, size: plan.size, entryPx: btc.markPx, leverage: 3, stopPx: plan.stop, tpPx: null, marketMaxLeverage: btc.maxLeverage });
      updatePrefs({ mode: "practice" });
      router.push("/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const cur = STEPS[step];
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
          <span className="small">Step {Math.min(step + 1, 4)} of 4</span>
        </div>
        <div className="grid4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 4, borderRadius: 2, background: i <= step ? "var(--amber)" : "var(--line)" }} />)}
        </div>

        {!last ? (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>{cur.heading}</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>{cur.coach}</p>
            </div>
            <div className="stack" role="radiogroup" aria-label={cur.heading}>
              {cur.options.map(([id, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={choice[cur.key] === id}
                  className="choice wide"
                  onClick={() => setChoice({ ...choice, [cur.key]: id })}
                >
                  {label}
                  <small>{sub}</small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="stack">
              <h2 className="display" style={{ fontSize: 34 }}>Here's your plan.</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>SaqBot sized the position so hitting your stop costs exactly what you chose. The stop goes out together with the entry, so the job is never unprotected.</p>
            </div>
            {plan && (
              <div className="panel" style={{ gap: 0 }}>
                <div className="list-row"><span className="small">Job</span><strong>{choice.side === "long" ? "Long" : "Short"} BTC at 3x</strong></div>
                <div className="list-row"><span className="small">Stop-loss</span><strong className="down">{choice.stop === "tight" ? 1 : choice.stop === "normal" ? 2 : 4}% from entry</strong></div>
                <div className="list-row"><span className="small">If the stop hits</span><strong>You lose ${choice.risk}</strong></div>
                <div className="list-row"><span className="small">Position value</span><strong>${Math.round(plan.notional).toLocaleString("en-US")}</strong></div>
              </div>
            )}
          </>
        )}
        {error && <p className="notice notice-error">{error}</p>}
        <div className="spacer" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
          <button className="btn btn-amber" onClick={() => (last ? run() : setStep(step + 1))}>{last ? "Run the practice job" : "Next"}</button>
        </div>
      </main>
    </>
  );
}
