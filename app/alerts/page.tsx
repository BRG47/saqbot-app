"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EventList } from "../../components/EventList";
import { Band, TabBar, ToggleRow, useRequireSignIn } from "../../components/ui";
import { subscribePush, unsubscribePush } from "../../lib/client/push";
import { useSaqbot } from "../../lib/client/saqbot";
import { CONTACT_EMAIL, TELEGRAM_BOT_USERNAME } from "../../lib/config";
import { REPS } from "../../lib/rep";

export default function Alerts() {
  const signedIn = useRequireSignIn();
  const { prefs, updatePrefs, api, markets, agent, endSession, logout } = useSaqbot();
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [limit, setLimit] = useState<string>(prefs.dailyLossLimit?.toString() ?? "");
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const [tgTest, setTgTest] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const me = useQuery({
    queryKey: ["me"],
    enabled: signedIn,
    queryFn: () => api<{ telegramLinked: boolean }>("/api/me"),
    refetchInterval: (q) => (tgUrl && !q.state.data?.telegramLinked ? 3_000 : false),
  });
  if (!signedIn) return null;
  const a = prefs.alerts;
  const trades = !prefs.rep || REPS[prefs.rep].trades;

  async function setPush(on: boolean) {
    setMsg(null);
    try {
      if (on) await api("/api/push", { method: "POST", body: JSON.stringify(await subscribePush()) });
      else {
        await unsubscribePush();
        await api("/api/push", { method: "DELETE" });
      }
      updatePrefs({ alerts: { ...a, push: on } });
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Step 1 of linking: make a one-time link. Step 2 is the user tapping "Open Telegram" and pressing Start. */
  async function linkTelegram() {
    setMsg(null);
    try {
      const { url } = await api<{ url: string }>("/api/telegram/link", { method: "POST" });
      updatePrefs({ alerts: { ...a, telegram: true } });
      setTgUrl(url);
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    }
  }

  async function sendTelegramTest() {
    setTgTest("Sending…");
    try {
      await api("/api/telegram/test", { method: "POST" });
      setTgTest("Sent. Check Telegram.");
    } catch (e) {
      setTgTest(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteData() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await unsubscribePush().catch(() => {});
      await api("/api/me", { method: "DELETE" });
      endSession();
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("saqbot.")) localStorage.removeItem(k);
      } catch {
        // storage blocked: nothing to clear
      }
      await logout();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  const coins = markets.slice(0, 16).map((m) => m.name);
  const toggleCoin = (c: string) =>
    updatePrefs({ alerts: { ...a, watchlist: a.watchlist.includes(c) ? a.watchlist.filter((x) => x !== c) : [...a.watchlist, c] } });

  return (
    <>
      <Band title="Alerts and intel" back="/home" />
      <main className="screen">
        <div className="stack">
          <h1 className="display h1">Get tipped off before the heat shows up.</h1>
          <p className="lead">Choose where alerts land and what's worth waking you up for.</p>
        </div>

        <section className="stack">
          <span className="small" style={{ fontWeight: 600 }}>Where should we tip you off?</span>
          <ToggleRow title="App notifications" sub="On iPhone, add SaqBot to your home screen first" checked={a.push} onChange={setPush} />
          <ToggleRow
            title="Telegram"
            sub={me.data?.telegramLinked ? `Linked to @${TELEGRAM_BOT_USERNAME}, read-only` : `From @${TELEGRAM_BOT_USERNAME}, read-only`}
            checked={a.telegram}
            onChange={(on) => (on && !me.data?.telegramLinked ? linkTelegram() : updatePrefs({ alerts: { ...a, telegram: on } }))}
          />
          {msg?.kind === "error" && <p className="notice notice-error" role="alert">{msg.text}</p>}
          {a.telegram && !me.data?.telegramLinked && (
            <div className="panel" style={{ borderColor: "var(--amber)" }}>
              <strong>One more step</strong>
              <span className="small">
                Open Telegram and press <b>Start</b> in @{TELEGRAM_BOT_USERNAME}. This page updates by itself once you're linked.
              </span>
              {tgUrl ? (
                <a className="btn" href={tgUrl} target="_blank" rel="noopener noreferrer">Open Telegram</a>
              ) : (
                <button className="btn" onClick={linkTelegram}>Get my Telegram link</button>
              )}
              {tgUrl && <span className="tiny">Waiting for you to press Start… The link works for 15 minutes.</span>}
            </div>
          )}
          {a.telegram && me.data?.telegramLinked && (
            <div className="panel" style={{ gap: 8 }}>
              <span className="up" style={{ fontWeight: 600 }}>✓ Telegram linked</span>
              <span className="small">Send /menu in Telegram to change alerts there. Changes sync with this screen.</span>
              <button className="btn btn-quiet btn-sm" onClick={sendTelegramTest}>Send a test alert</button>
              {tgTest && <span className="tiny">{tgTest}</span>}
            </div>
          )}
        </section>

        <section className="stack">
          <span className="small" style={{ fontWeight: 600 }}>What's worth a tip-off?</span>
          <ToggleRow title="5-star events" sub="Heads-up the day before and an hour before" checked={a.events} onChange={(v) => updatePrefs({ alerts: { ...a, events: v } })} />
          <ToggleRow title="Big moves" sub="Sharp price runs on unusual volume" checked={a.moves} onChange={(v) => updatePrefs({ alerts: { ...a, moves: v } })} />
          <ToggleRow title="Crowded trades" sub="Funding spikes when one side piles in" checked={a.crowded} onChange={(v) => updatePrefs({ alerts: { ...a, crowded: v } })} />
          {trades && <ToggleRow title="Heat on your jobs" sub="Near your stop or liquidation" checked={a.heat} onChange={(v) => updatePrefs({ alerts: { ...a, heat: v } })} />}
        </section>

        <section className="stack">
          <span className="small" style={{ fontWeight: 600 }}>Markets to watch</span>
          <div className="chips">
            {coins.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={a.watchlist.includes(c)} onClick={() => toggleCoin(c)}>{c}</button>
            ))}
          </div>
        </section>

        <EventList />

        {msg?.kind === "ok" && <p className="notice notice-ok" role="status">{msg.text}</p>}

        <section className="panel">
          <h2 className="display h2">Your account</h2>
          {trades && (
            <label className="field">
              Daily loss limit in USD (blank for none)
              <input
                inputMode="decimal"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                onBlur={() => updatePrefs({ dailyLossLimit: Number(limit) > 0 ? Number(limit) : null })}
              />
            </label>
          )}
          <Link className="btn btn-quiet btn-sm" href="/rep">Change my rep ({prefs.rep ? REPS[prefs.rep].rank : "not set"})</Link>
          {agent && <button className="btn btn-quiet btn-sm" onClick={endSession}>End trading session on this device</button>}
          <button className="btn btn-quiet btn-sm" onClick={() => logout()}>Sign out</button>
          {confirmDelete ? (
            <div className="notice notice-error stack">
              <span>
                This permanently deletes your SaqBot account record, wallet address, alert settings, Telegram link and notification subscriptions,
                and clears SaqBot from this device. Your funds stay in your wallet. To also delete your login and embedded wallet, email
                {CONTACT_EMAIL} after withdrawing.
              </span>
              <div className="grid2">
                <button className="btn btn-quiet btn-sm" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep my data</button>
                <button className="btn btn-danger btn-sm" disabled={deleting} onClick={deleteData}>{deleting ? "Deleting…" : "Delete for good"}</button>
              </div>
              {deleteError && <span role="alert">{deleteError}</span>}
            </div>
          ) : (
            <button className="btn btn-text btn-sm" style={{ color: "var(--down)" }} onClick={() => setConfirmDelete(true)}>Delete my SaqBot data</button>
          )}
          <nav className="footer-links" aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </nav>
        </section>
      </main>
      <TabBar />
    </>
  );
}
