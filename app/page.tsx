"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSaqbot } from "../lib/client/saqbot";

export default function Welcome() {
  const { ready, authenticated, prefs } = useSaqbot();
  const { login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.replace(prefs.rep ? "/home" : "/rep");
  }, [ready, authenticated, prefs.rep, router]);

  return (
    <>
      <header className="band">
        <span className="display title">SaqBot</span>
      </header>
      <main className="screen">
        <div className="stack" style={{ gap: 14, paddingTop: 24 }}>
          <h1 className="display" style={{ fontSize: 56, lineHeight: 0.95 }}>
            The 5-Star Cheat Code.
            <br />
            Every. Single. Trade.
          </h1>
          <p className="display down" style={{ fontSize: 30 }}>No more getting Wasted.</p>
          <p className="lead" style={{ fontSize: 17 }}>
            The code is simple: plan your getaway before you pull the job. Do practice runs with fake cash, then go live with
            your getaway planned. Or full send, if that's your style.
          </p>
        </div>
        <div className="spacer" />
        <div className="stack" style={{ gap: 12 }}>
          <button className="btn" disabled={!ready} onClick={() => login({ loginMethods: ["google"] })}>Continue with Google</button>
          <button className="btn btn-quiet" disabled={!ready} onClick={() => login({ loginMethods: ["email"] })}>Continue with email</button>
          <Link className="btn btn-text" href="/practice">Do a practice run first, no sign-up</Link>
          <p className="tiny" style={{ textAlign: "center" }}>
            SaqBot creates a wallet for you and never asks for a seed phrase. Already have a wallet?{" "}
            <button className="btn-text" style={{ border: 0, background: "none", padding: 0, textDecoration: "underline", cursor: "pointer", color: "var(--ink)" }} onClick={() => login({ loginMethods: ["wallet"] })}>
              Connect it
            </button>
          </p>
        </div>
      </main>
    </>
  );
}
