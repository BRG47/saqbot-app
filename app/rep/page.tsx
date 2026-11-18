"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Band, ToggleRow } from "../../components/ui";
import { useSaqbot } from "../../lib/client/saqbot";
import { REPS, type Rep } from "../../lib/rep";

export default function RepPage() {
  const { prefs, updatePrefs } = useSaqbot();
  const router = useRouter();
  const [rep, setRep] = useState<Rep>(prefs.rep ?? "novice");
  const [telegram, setTelegram] = useState(prefs.alerts.telegram);
  const cfg = REPS[rep];

  function next() {
    updatePrefs({
      rep,
      mode: rep === "novice" ? "practice" : prefs.mode,
      dailyLossLimit: prefs.dailyLossLimit ?? cfg.dailyLossDefault,
      alerts: { ...prefs.alerts, telegram, heat: cfg.trades },
    });
    router.push(rep === "novice" ? "/briefing" : rep === "lookout" ? "/alerts" : "/fund");
  }

  return (
    <>
      <Band title="SaqBot" back="/" />
      <main className="screen">
        <div className="stack">
          <h1 className="display h1">What's your rep on the streets?</h1>
          <p className="lead">Pick your level and SaqBot sets up your crew to match. You can change it anytime.</p>
        </div>
        <div className="stack" role="radiogroup" aria-label="Experience level">
          {(Object.keys(REPS) as Rep[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={rep === id} className="choice wide" onClick={() => setRep(id)}>
              <span className="row">
                <span className="display" style={{ fontSize: 22 }}>{REPS[id].rank}</span>
                <span style={{ fontSize: 13 }}>{REPS[id].level}</span>
              </span>
              <small>{REPS[id].desc}</small>
            </button>
          ))}
        </div>
        <div className="panel" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Your setup</span>
          {cfg.setup.map((s) => (
            <div key={s} style={{ display: "flex", gap: 10, fontSize: 15 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--up)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
                <path d="M5 12l5 5 9-10" />
              </svg>
              {s}
            </div>
          ))}
        </div>
        <ToggleRow title="Telegram alerts" sub="Optional, on top of app notifications" checked={telegram} onChange={setTelegram} />
        <div className="panel" style={{ gap: 8, marginTop: -8 }}>
          <strong style={{ fontSize: 15 }}>Insider Info:</strong>
          <ul className="insider">
            <li><b>Liquidation warning:</b> your job&apos;s price is within 3% of liquidation. Sent at most once an hour per job.</li>
            <li><b>Heat rising (near your stop):</b> price is within 1% of your stop-loss, so you know the planned exit may trigger soon.</li>
            <li><b>Big moves:</b> a coin on your watchlist moved sharply in the last hour (2%+ for BTC and ETH, 4%+ for others) on at least twice its usual volume.</li>
            <li><b>Crowded trades:</b> funding on a watchlist coin hits 0.01% an hour or more, meaning one side is paying heavily to stay in. Sent at most every 6 hours per coin.</li>
            <li><b>5-star events:</b> a heads-up the day before major scheduled events rated 3 stars or higher, plus an &ldquo;under an hour&rdquo; reminder before every event.</li>
          </ul>
        </div>
        <button className="btn" onClick={next}>
          {rep === "novice" ? "Read the Briefing" : rep === "lookout" ? "Set up my alerts" : "Continue"}
        </button>
      </main>
    </>
  );
}
