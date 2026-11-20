"use client";

import { useEffect, useState } from "react";
import { watchTrades, type LiveTrade } from "../hyperliquid";

/** How far back the live buy/sell tally looks. */
export const FLOW_WINDOW_MS = 5 * 60_000;

export type TradeFlow = {
  buyUsd: number;
  sellUsd: number;
  /** How much time the tally covers so far, up to FLOW_WINDOW_MS. */
  coveredMs: number;
};

/**
 * Live tally of market buys vs market sells on one coin, over a rolling 5 minutes.
 * Hyperliquid has no history of this, so it starts from zero when the screen opens.
 */
export function useTradeFlow(coin: string): TradeFlow {
  const [flow, setFlow] = useState<TradeFlow>({ buyUsd: 0, sellUsd: 0, coveredMs: 0 });

  useEffect(() => {
    let earliest = Date.now();
    const trades = new Map<number, LiveTrade>();
    const recount = () => {
      const now = Date.now();
      const cutoff = now - FLOW_WINDOW_MS;
      let buyUsd = 0;
      let sellUsd = 0;
      for (const [tid, tr] of trades) {
        if (tr.t < cutoff) trades.delete(tid);
        else if (tr.buy) buyUsd += tr.usd;
        else sellUsd += tr.usd;
      }
      setFlow({ buyUsd, sellUsd, coveredMs: Math.min(FLOW_WINDOW_MS, now - earliest) });
    };
    setFlow({ buyUsd: 0, sellUsd: 0, coveredMs: 0 });
    const stop = watchTrades(coin, (batch) => {
      for (const tr of batch) {
        trades.set(tr.tid, tr);
        if (tr.t < earliest) earliest = tr.t;
      }
    });
    const timer = setInterval(recount, 1_000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [coin]);

  return flow;
}
