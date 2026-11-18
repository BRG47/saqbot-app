"use client";

import { useCallback, useEffect, useState } from "react";
import { getMids } from "../hyperliquid";
import { cashOutPractice, loadPractice, openPracticeJob, resetPractice, savePractice, tickPractice, type PracticeClosed, type PracticeState } from "../practice";

/** Practice account with live prices. Checks stops, take-profits and liquidations every 10 seconds. */
export function usePractice() {
  const [state, setState] = useState<PracticeState | null>(null);
  const [mids, setMids] = useState<Record<string, number>>({});
  const [lastClosed, setLastClosed] = useState<PracticeClosed[]>([]);

  useEffect(() => setState(loadPractice()), []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const m = await getMids();
        if (!alive) return;
        setMids(m);
        setState((s) => {
          if (!s) return s;
          const { state: next, events } = tickPractice(s, m);
          if (events.length) {
            savePractice(next);
            setLastClosed(events);
          }
          return events.length ? next : s;
        });
      } catch {
        // keep the last prices
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const commit = useCallback((next: PracticeState) => {
    savePractice(next);
    setState(next);
  }, []);

  return {
    state,
    mids,
    lastClosed,
    open: (j: Parameters<typeof openPracticeJob>[1]) => state && commit(openPracticeJob(state, j)),
    cashOut: (id: string, coin: string) => state && mids[coin] && commit(cashOutPractice(state, id, mids[coin])),
    reset: () => setState(resetPractice()),
  };
}
