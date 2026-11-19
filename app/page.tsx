"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Brand } from "../components/ui";
import { useSaqbot } from "../lib/client/saqbot";

export default function Welcome() {
  const { ready, authenticated, prefs } = useSaqbot();
  const { login } = usePrivy();
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);

  // Respect "reduce motion": don't autoplay, show controls so people can play it themselves.
  useEffect(() => {
    const v = video.current;
    if (v && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.controls = true;
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) router.replace(prefs.rep ? "/home" : "/rep");
  }, [ready, authenticated, prefs.rep, router]);

  return (
    <>
      <header className="band">
        <Brand />
      </header>
      <main className="screen">
        <div className="stack" style={{ gap: 14, paddingTop: 8 }}>
          {/* Plays once, muted (browsers only autoplay muted video), then holds on the last frame. */}
          <video
            ref={video}
            className="landing-video"
            src="/landing.mp4"
            width={896}
            height={336}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label="SaqBot intro animation"
          />
          <h1 className="display" style={{ fontSize: 56, lineHeight: 0.95 }}>
            Profit is the <span style={{ color: "var(--neon)", textShadow: "0 0 16px rgba(57, 255, 20, 0.5)" }}>TARGET</span>
          </h1>
          <p className="display down" style={{ fontSize: 30 }}>Just don&apos;t get WASTED</p>
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
            <button className="btn-text" style={{ border: 0, background: "none", padding: 0, textDecoration: "underline", cursor: "pointer", color: "var(--sage)" }} onClick={() => login({ loginMethods: ["wallet"] })}>
              Connect it
            </button>
          </p>
          <p className="tiny" style={{ textAlign: "center" }}>
            By continuing you agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
