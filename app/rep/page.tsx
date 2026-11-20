"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Band, ToggleRow } from "../../components/ui";
import { useSaqbot } from "../../lib/client/saqbot";
import { REPS, type Rep } from "../../lib/rep";
import { RESTRICTED_MESSAGE } from "../../lib/client/geo";

export default function RepPage() {
  const { prefs, updatePrefs, geoRestricted } = useSaqbot();
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
    router.push(rep === "novice" ? "/briefing" : rep === "lookout" ? "/alerts" : geoRestricted ? "/practice" : "/fund");
  }

  return (
    <>
      <Band title="SaqBot" back="/" />
      <main className="screen">
        <div className="stack">
          <h1 className="display h1">What's your rep on the streets?</h1>
          <p className="lead">Pick your level and SaqBot sets up your crew to match. You can change it anytime.</p>
        </div>
        {geoRestricted && <p className="notice notice-warn">{RESTRICTED_MESSAGE}</p>}
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
        <button className="btn" onClick={next}>
          {rep === "novice" ? "Read the Briefing" : rep === "lookout" ? "Set up my alerts" : "Continue"}
        </button>
      </main>
    </>
  );
}
