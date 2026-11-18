"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Band } from "../../components/ui";
import { useSaqbot } from "../../lib/client/saqbot";

const ITEMS = [
  ["Leverage", "Leverage is a faster getaway car", "At 3x, a 1% price move becomes a 3% move on the money you put up. That works in both directions: more speed, harder crash."],
  ["Liquidation", "Liquidation means Wasted", "If price runs far enough against you, the exchange closes your trade and the margin on it is gone. SaqBot shows this price before every job."],
  ["Stop-loss", "Plan the getaway before the job", "A stop-loss closes the trade at a price you pick, so a bad job costs what you decided up front. Full send skips it, and liquidation becomes your exit."],
  ["Position sizing", "Never bring the whole stash", "Many traders risk 1 to 2% of their account per trade. A losing streak then stings without ending your run."],
  ["Funding", "Everyone pays protection", "Every hour, one side of the market pays the other to keep positions open. When the crowd piles in long, longs usually pay. Long holds add up."],
  ["Fees", "The house always takes a cut", "You pay a fee to open and another to close. Lots of small, fast trades can lose money even when price goes nowhere."],
  ["Volatility", "Heat shows up fast", "Prices can spike and snap back in seconds. A stop that's too tight gets hit by normal noise; a wider stop needs a smaller position."],
  ["Revenge trading", "Busted? Lay low", "After a loss, the urge is to jump straight back in bigger. That's how a bad day turns into a wiped account. Your daily loss limit is there to stop it."],
] as const;

export default function Briefing() {
  const { updatePrefs } = useSaqbot();
  useEffect(() => updatePrefs({ briefed: true }), [updatePrefs]);

  return (
    <>
      <Band title="The Briefing" back="/rep" />
      <main className="screen" style={{ gap: 14 }}>
        <div className="stack">
          <h1 className="display" style={{ fontSize: 40 }}>Eight things to know before your first job.</h1>
          <p className="lead">Two minutes now can save your whole stash later. Each one comes with the real trading term so you'll recognize it anywhere.</p>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {ITEMS.map(([term, title, body], i) => (
            <li key={term} className="panel" style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
              <span className="display" aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "var(--neon)", color: "var(--on-neon)", display: "grid", placeItems: "center", fontSize: 20 }}>
                {i + 1}
              </span>
              <div className="stack" style={{ gap: 4 }}>
                <span className="tiny" style={{ fontWeight: 600, color: "var(--sage)" }}>{term}</span>
                <h2 className="display" style={{ fontSize: 24 }}>{title}</h2>
                <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="notice notice-warn">
          <strong className="display" style={{ fontSize: 22, display: "block" }}>Practice runs are free</strong>
          Run a few jobs with fake cash on real prices first. Most people learn more from three practice runs than from reading anything.
        </div>
        <Link className="btn" href="/practice">Got it, start a practice run</Link>
        <Link className="btn btn-quiet" href="/fund">Skip to stocking your stash</Link>
      </main>
    </>
  );
}
