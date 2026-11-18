import Link from "next/link";
import type { ReactNode } from "react";
import { Band } from "./ui";

export const LEGAL_UPDATED = "November 18, 2026";
export const CONTACT_EMAIL = "hello@saqbot.xyz";

/** Shared layout for the Privacy Policy and Terms of Service. Plain server-rendered HTML: no scripts, CSP-safe. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <>
      <Band title={title} back="/" />
      <main className="screen legal">
        <div className="stack">
          <h1 className="display h1">{title}</h1>
          <p className="tiny">Last updated {LEGAL_UPDATED}</p>
          <p className="lead">{intro}</p>
        </div>
        {children}
        <nav className="legal-links" aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </nav>
      </main>
    </>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="stack" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="display h2">{title}</h2>
      {children}
    </section>
  );
}
