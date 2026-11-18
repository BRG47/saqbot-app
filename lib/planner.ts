import { MIN_ORDER_USD } from "./config";

export type Side = "long" | "short";
/** Stop distance presets, or "none" for full send (no stop-loss). */
export type StopStyle = "tight" | "normal" | "wide" | "none" | "custom";

export const STOP_PRESETS: Record<"tight" | "normal" | "wide", number> = { tight: 0.01, normal: 0.02, wide: 0.04 };

export type PlanInput = {
  side: Side;
  entry: number;
  stopStyle: StopStyle;
  /** Used when stopStyle is "custom". */
  customStop?: number;
  /** Optional take-profit price. 0 or NaN means none. */
  takeProfit?: number;
  /** With a stop: the most the user will lose. Full send: the margin they put in. */
  amountUsd: number;
  leverage: number;
  marketMaxLeverage: number;
  fundingHourly: number;
  holdHours: number;
  accountValue: number | null;
};

export type Plan = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  fullSend: boolean;
  stop: number | null;
  takeProfit: number | null;
  size: number;
  notional: number;
  margin: number;
  /** Worst case loss before fees: the stop distance, or the whole margin on full send. */
  maxLoss: number;
  liqPx: number;
  rMultiple: number | null;
  fundingCost: number;
  wantedLevel: number;
};

/**
 * Estimated isolated-margin liquidation price using Hyperliquid's documented formula.
 * Maintenance margin is half the initial margin at the market's max leverage.
 */
export function estimateLiqPx(side: Side, entry: number, leverage: number, marketMaxLeverage: number): number {
  const dir = side === "long" ? 1 : -1;
  const mmr = 1 / (2 * marketMaxLeverage);
  return entry - (dir * entry * (1 / leverage - mmr)) / (1 - mmr * dir);
}

export function buildPlan(p: PlanInput): Plan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dir = p.side === "long" ? 1 : -1;
  const fullSend = p.stopStyle === "none";
  const lev = Math.max(1, Math.min(p.leverage, p.marketMaxLeverage));

  let stop: number | null = null;
  if (p.stopStyle === "custom") stop = p.customStop && p.customStop > 0 ? p.customStop : null;
  else if (p.stopStyle !== "none") stop = p.entry * (1 - dir * STOP_PRESETS[p.stopStyle]);

  const tp = p.takeProfit && p.takeProfit > 0 ? p.takeProfit : null;

  if (!(p.entry > 0)) errors.push("Waiting for a price for this market.");
  if (!(p.amountUsd > 0)) errors.push(fullSend ? "Enter how much margin to put in." : "Enter the most you're willing to lose.");
  if (p.stopStyle === "custom" && !stop) errors.push("Enter a stop price, or pick a preset or full send.");
  if (stop && (stop - p.entry) * dir >= 0) {
    errors.push(p.side === "long" ? "For a long, the stop goes below the entry." : "For a short, the stop goes above the entry.");
  }
  if (tp && (tp - p.entry) * dir <= 0) {
    errors.push(p.side === "long" ? "For a long, take-profit goes above the entry." : "For a short, take-profit goes below the entry.");
  }

  const liqPx = p.entry > 0 ? estimateLiqPx(p.side, p.entry, lev, p.marketMaxLeverage) : 0;
  let notional = 0;
  if (fullSend) notional = p.amountUsd * lev;
  else if (stop) notional = (p.amountUsd / Math.abs(p.entry - stop)) * p.entry;
  const size = p.entry > 0 ? notional / p.entry : 0;
  const margin = notional / lev;
  const maxLoss = fullSend ? margin : p.amountUsd;
  const rMultiple = tp && stop ? Math.abs(tp - p.entry) / Math.abs(p.entry - stop) : null;
  const fundingCost = notional * p.fundingHourly * p.holdHours * dir;

  if (errors.length === 0) {
    if (stop && (stop - liqPx) * dir <= 0) {
      errors.push("You'd be liquidated before your stop is hit. Lower the leverage or move the stop closer.");
    } else if (stop && Math.abs(stop - liqPx) / p.entry < 0.005) {
      warnings.push("Your stop sits very close to liquidation. A fast wick could liquidate you first.");
    }
    if (notional < MIN_ORDER_USD) errors.push(`Jobs need at least $${MIN_ORDER_USD} of position value. Raise the amount or tighten the stop.`);
    if (p.accountValue !== null && margin > p.accountValue) {
      errors.push("This needs more margin than your stash holds. Lower the amount or raise leverage carefully.");
    }
    if (fullSend) warnings.push(`Full send: no stop-loss. If price reaches liquidation, the whole $${margin.toFixed(2)} margin is gone.`);
    if (rMultiple !== null && rMultiple < 1) warnings.push("Your potential reward is smaller than your risk on this job.");
    if (fundingCost > maxLoss * 0.25) warnings.push("Funding over your planned hold eats more than a quarter of your risk.");
    if (p.accountValue && maxLoss / p.accountValue > 0.05) warnings.push("You're risking more than 5% of your stash on one job.");
  }

  let wanted = 0;
  if (lev > 3) wanted++;
  if (lev > 10) wanted++;
  if (p.accountValue && maxLoss / p.accountValue > 0.02) wanted++;
  if (p.accountValue && maxLoss / p.accountValue > 0.05) wanted++;
  if (fullSend) wanted += 2;
  if (liqPx > 0 && Math.abs(p.entry - liqPx) / p.entry < 0.05) wanted++;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    fullSend,
    stop,
    takeProfit: tp,
    size,
    notional,
    margin,
    maxLoss,
    liqPx,
    rMultiple,
    fundingCost,
    wantedLevel: Math.min(5, wanted),
  };
}

/** Wanted level for an open position, from how close price is to liquidation and the stop. */
export function positionWantedLevel(markPx: number, liqPx: number | null, stopPx: number | null, leverage: number): number {
  let w = 0;
  if (leverage > 3) w++;
  if (leverage > 10) w++;
  if (!stopPx) w += 2;
  if (liqPx) {
    const d = Math.abs(markPx - liqPx) / markPx;
    if (d < 0.1) w++;
    if (d < 0.03) w++;
  }
  if (stopPx && Math.abs(markPx - stopPx) / markPx < 0.01) w++;
  return Math.min(5, w);
}
