import type { Rep } from "./rep";

/** Device-side preferences. Alert settings are also mirrored to the server so alerts can be sent. */
export type AlertSettings = {
  push: boolean;
  telegram: boolean;
  events: boolean;
  moves: boolean;
  crowded: boolean;
  heat: boolean;
  watchlist: string[];
};

export type Prefs = {
  rep: Rep | null;
  mode: "live" | "practice";
  briefed: boolean;
  dailyLossLimit: number | null;
  alerts: AlertSettings;
  /** When the user confirmed they aren't a resident or citizen of a restricted region. */
  eligibleConfirmedAt: string | null;
};

export const DEFAULT_PREFS: Prefs = {
  rep: null,
  mode: "practice",
  briefed: false,
  dailyLossLimit: null,
  eligibleConfirmedAt: null,
  alerts: { push: true, telegram: false, events: true, moves: true, crowded: false, heat: true, watchlist: ["BTC", "ETH", "SOL"] },
};

const KEY = "saqbot.prefs";

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { ...DEFAULT_PREFS, ...p, alerts: { ...DEFAULT_PREFS.alerts, ...(p.alerts ?? {}) } };
    }
  } catch {
    // use defaults
  }
  return DEFAULT_PREFS;
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked
  }
}
