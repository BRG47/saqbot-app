"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EventList } from "../../components/EventList";
import { Band, TabBar, ToggleRow, useRequireSignIn } from "../../components/ui";
import { subscribePush, unsubscribePush } from "../../lib/client/push";
import { useSaqbot } from "../../lib/client/saqbot";
import { REPS } from "../../lib/rep";

export default function Alerts() {
  const signedIn = useRequireSignIn();
  const { prefs, updatePrefs, api, markets, agent, endSession, logout } = useSaqbot();
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [limit, setLimit] = useState<string>(prefs.dailyLossLimit?.toString() ?? "");
  const me = useQuery({
    queryKey: ["me"],
    enabled: signedIn,
    queryFn: () => api<{ telegramLinked: boolean }>("/api/me"),
    refetchInterval: (q) => (prefs.alerts.telegram && !q.state.data?.telegramLinked ? 5_000 : false),
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

  async function linkTelegram() {
    setMsg(null);
    try {
      const { url } = await api<{ url: string }>("/api/telegram/link", { method: "POST" });
      updatePrefs({ alerts: { ...a, telegram: true } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
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
            sub={me.data?.telegramLinked ? "Linked to @Trade_SaqBot, read-only" : "From @Trade_SaqBot, read-only"}
            checked={a.telegram}
            onChange={(on) => (on && !me.data?.telegramLinked ? linkTelegram() : updatePrefs({ alerts: { ...a, telegram: on } }))}
          />
          {a.telegram && !me.data?.telegramLinked && (
            <button className="btn btn-quiet btn-sm" onClick={linkTelegram}>Open Telegram to link</button>
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

        {msg && <p className={`notice notice-${msg.kind}`} role="status">{msg.text}</p>}

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
        </section>
      </main>
      <TabBar />
    </>
  );
}
