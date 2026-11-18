"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSaqbot } from "../lib/client/saqbot";
import { REPS } from "../lib/rep";

export function Band({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="band">
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      )}
      <span className="display title">{title}</span>
      {right}
    </header>
  );
}

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

export function Stars({ level, size = 18 }: { level: number; size?: number }) {
  return (
    <span className="stars" role="img" aria-label={`Wanted level ${level} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i < level ? "on" : ""} aria-hidden="true">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />;
}

export function ToggleRow({ title, sub, checked, onChange }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="panel" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
      <span className="stack" style={{ gap: 0 }}>
        <strong style={{ fontSize: 15 }}>{title}</strong>
        {sub && <span className="tiny">{sub}</span>}
      </span>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Plain-English tip shown only to levels that asked for tips. */
export function Tip({ children }: { children: ReactNode }) {
  const { prefs } = useSaqbot();
  if (prefs.rep && !REPS[prefs.rep].showTips) return null;
  return <p className="small">{children}</p>;
}

export function TabBar() {
  const path = usePathname();
  const { prefs } = useSaqbot();
  const trades = !prefs.rep || REPS[prefs.rep].trades;
  const tabs = [
    { href: "/home", label: "Home", d: "M4 11l8-7 8 7v9h-5v-6h-6v6H4z" },
    ...(trades
      ? [
          { href: "/plan", label: "Plan", d: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z" },
          { href: "/jobs", label: "Jobs", d: "M5 7h14M5 12h14M5 17h9" },
        ]
      : []),
    { href: "/alerts", label: "Alerts", d: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4" },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={t.d} />
          </svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Sends signed-out visitors back to the welcome screen. */
export function useRequireSignIn(required = true) {
  const { ready, authenticated } = useSaqbot();
  const router = useRouter();
  useEffect(() => {
    if (required && ready && !authenticated) router.replace("/");
  }, [required, ready, authenticated, router]);
  return required ? ready && authenticated : ready;
}

export function ModeSwitch() {
  const { prefs, updatePrefs } = useSaqbot();
  return (
    <div role="radiogroup" aria-label="Trading mode" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--line-strong)", borderRadius: 10, overflow: "hidden" }}>
      {(["live", "practice"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={prefs.mode === m}
          onClick={() => updatePrefs({ mode: m })}
          style={{ minHeight: 40, padding: "0 14px", border: 0, cursor: "pointer", fontWeight: 600, background: prefs.mode === m ? "var(--ink)" : "transparent", color: prefs.mode === m ? "var(--page)" : "var(--ink)" }}
        >
          {m === "live" ? "Live" : "Practice"}
        </button>
      ))}
    </div>
  );
}

export const usd = (n: number, digits?: number) =>
  (n < 0 ? "−$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits ?? (Math.abs(n) < 100 ? 2 : 0), maximumFractionDigits: digits ?? (Math.abs(n) < 100 ? 2 : 0) });

export const signedUsd = (n: number) => (n > 0 ? "+" : "") + usd(n);

export const px = (n: number | null | undefined) => (n ? n.toLocaleString("en-US", { maximumSignificantDigits: 6 }) : "None");
