/**
 * 5-star events: scheduled moments that have historically shaken crypto prices.
 * Stars come from how much BTC moved around past events of the same type.
 */
export type EventType = "fed" | "cpi" | "jobs" | "pce" | "earnings" | "unlock" | "etf" | "expiry" | "other";

export const EVENT_TYPES: Record<EventType, { label: string; fallbackStars: number }> = {
  fed: { label: "Fed rate decision", fallbackStars: 5 },
  cpi: { label: "US inflation report (CPI)", fallbackStars: 4 },
  pce: { label: "US inflation report (PCE)", fallbackStars: 3 },
  jobs: { label: "US jobs report", fallbackStars: 3 },
  earnings: { label: "Major earnings", fallbackStars: 3 },
  etf: { label: "ETF decision", fallbackStars: 3 },
  unlock: { label: "Token unlock", fallbackStars: 2 },
  expiry: { label: "Big options expiry", fallbackStars: 2 },
  other: { label: "Market event", fallbackStars: 2 },
};

export type MarketEvent = {
  id: number;
  type: EventType;
  title: string;
  detail: string | null;
  coin: string | null;
  startsAt: string;
  stars: number;
};

/** Turns an average absolute BTC move (in %) around past events into a 1-5 star rating. */
export function starsFromMove(avgAbsMovePct: number): number {
  if (avgAbsMovePct < 1) return 1;
  if (avgAbsMovePct < 2) return 2;
  if (avgAbsMovePct < 3) return 3;
  if (avgAbsMovePct < 4.5) return 4;
  return 5;
}
