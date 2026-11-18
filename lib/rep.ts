/** Experience levels ("rep") and what each one unlocks. */
export type Rep = "novice" | "intermediate" | "advanced" | "lookout";

export type RepConfig = {
  rank: string;
  level: string;
  desc: string;
  trades: boolean;
  /** Users can type exact stop and take-profit prices instead of presets. */
  customPrices: boolean;
  showTips: boolean;
  suggestedLeverage: number;
  /** Default daily loss limit in USD, or null for off. */
  dailyLossDefault: number | null;
  setup: string[];
};

export const REPS: Record<Rep, RepConfig> = {
  novice: {
    rank: "Fresh off the bus",
    level: "Novice",
    desc: "New to perps, leverage or both.",
    trades: true,
    customPrices: false,
    showTips: true,
    suggestedLeverage: 3,
    dailyLossDefault: 25,
    setup: [
      "The Briefing: eight must-knows before your first job",
      "Practice runs switched on, with $1,000 fake cash",
      "Suggested leverage on every job, you make the call",
      "Getaway presets, or full send with no stop-loss",
      "Daily loss limit on, so a bad day stays small",
      "Plain-English tips on every screen",
    ],
  },
  intermediate: {
    rank: "Street smart",
    level: "Intermediate",
    desc: "You have traded perps and used stop-losses before.",
    trades: true,
    customPrices: true,
    showTips: true,
    suggestedLeverage: 5,
    dailyLossDefault: 50,
    setup: [
      "Practice runs available anytime",
      "Presets, or set your own stop and take-profit prices",
      "Full send available when you want it",
      "Daily loss limit suggested, you pick the number",
      "Heat alerts on your active jobs",
    ],
  },
  advanced: {
    rank: "Kingpin",
    level: "Advanced",
    desc: "You size your own trades and know your liquidation math.",
    trades: true,
    customPrices: true,
    showTips: false,
    suggestedLeverage: 5,
    dailyLossDefault: null,
    setup: [
      "Type exact stop and take-profit prices, or full send",
      "Leverage up to the market max",
      "Compact screens with fewer tips",
      "Wanted Level warnings on every active job",
      "Daily loss limit optional",
    ],
  },
  lookout: {
    rank: "Lookout",
    level: "Alerts only",
    desc: "No trading. Just market intel and 5-star event alerts.",
    trades: false,
    customPrices: false,
    showTips: true,
    suggestedLeverage: 1,
    dailyLossDefault: null,
    setup: [
      "No funding or wallet needed to start",
      "Upcoming 5-star events, rated by past market impact",
      "Big moves, volume surges and crowded-trade alerts",
      "Pick your markets and how loud the alerts are",
      "Upgrade to trading anytime",
    ],
  },
};
