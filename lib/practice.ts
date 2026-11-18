import { PRACTICE_FEE_RATE, PRACTICE_START_USD } from "./config";
import { estimateLiqPx, type Side } from "./planner";

/** Practice runs: fake cash on real prices, stored on this device only. */
export type PracticeJob = {
  id: string;
  coin: string;
  side: Side;
  size: number;
  entryPx: number;
  leverage: number;
  margin: number;
  stopPx: number | null;
  tpPx: number | null;
  liqPx: number;
  openedAt: number;
};

export type PracticeClosed = PracticeJob & { exitPx: number; pnl: number; reason: "stop" | "tp" | "liquidated" | "cashed out"; closedAt: number };

export type PracticeState = { cash: number; open: PracticeJob[]; closed: PracticeClosed[] };

const KEY = "saqbot.practice";

export function loadPractice(): PracticeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PracticeState;
  } catch {
    // fall through to a fresh account
  }
  return { cash: PRACTICE_START_USD, open: [], closed: [] };
}

export function savePractice(s: PracticeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked: state lives until reload
  }
}

export function resetPractice(): PracticeState {
  const s = { cash: PRACTICE_START_USD, open: [], closed: [] };
  savePractice(s);
  return s;
}

export function openPracticeJob(
  s: PracticeState,
  j: { coin: string; side: Side; size: number; entryPx: number; leverage: number; stopPx: number | null; tpPx: number | null; marketMaxLeverage: number },
): PracticeState {
  const margin = (j.size * j.entryPx) / j.leverage;
  const fee = j.size * j.entryPx * PRACTICE_FEE_RATE;
  if (margin + fee > s.cash) throw new Error("Not enough practice cash for this job.");
  const job: PracticeJob = {
    id: Math.random().toString(36).slice(2),
    coin: j.coin,
    side: j.side,
    size: j.size,
    entryPx: j.entryPx,
    leverage: j.leverage,
    margin,
    stopPx: j.stopPx,
    tpPx: j.tpPx,
    liqPx: estimateLiqPx(j.side, j.entryPx, j.leverage, j.marketMaxLeverage),
    openedAt: Date.now(),
  };
  return { ...s, cash: s.cash - margin - fee, open: [...s.open, job] };
}

export function pnlAt(j: PracticeJob, px: number): number {
  return (px - j.entryPx) * j.size * (j.side === "long" ? 1 : -1);
}

function close(s: PracticeState, j: PracticeJob, exitPx: number, reason: PracticeClosed["reason"]): PracticeState {
  const fee = j.size * exitPx * PRACTICE_FEE_RATE;
  const pnl = reason === "liquidated" ? -j.margin : pnlAt(j, exitPx) - fee;
  const back = Math.max(0, j.margin + pnl);
  return {
    cash: s.cash + back,
    open: s.open.filter((o) => o.id !== j.id),
    closed: [{ ...j, exitPx, pnl, reason, closedAt: Date.now() }, ...s.closed].slice(0, 100),
  };
}

export function cashOutPractice(s: PracticeState, id: string, px: number): PracticeState {
  const j = s.open.find((o) => o.id === id);
  return j ? close(s, j, px, "cashed out") : s;
}

/** Checks every open practice job against current prices and closes any that hit stop, take-profit or liquidation. */
export function tickPractice(s: PracticeState, mids: Record<string, number>): { state: PracticeState; events: PracticeClosed[] } {
  let state = s;
  for (const j of s.open) {
    const px = mids[j.coin];
    if (!px) continue;
    const dir = j.side === "long" ? 1 : -1;
    if ((px - j.liqPx) * dir <= 0) state = close(state, j, j.liqPx, "liquidated");
    else if (j.stopPx && (px - j.stopPx) * dir <= 0) state = close(state, j, j.stopPx, "stop");
    else if (j.tpPx && (px - j.tpPx) * dir >= 0) state = close(state, j, j.tpPx, "tp");
  }
  const events = state.closed.filter((c) => !s.closed.some((o) => o.id === c.id));
  return { state, events };
}
