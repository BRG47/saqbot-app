import { HttpTransport, InfoClient, SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import { IS_TESTNET } from "./config";

export const transport = new HttpTransport({ isTestnet: IS_TESTNET });
export const info = new InfoClient({ transport });

export type Market = {
  name: string;
  /** Asset index used in orders. */
  index: number;
  szDecimals: number;
  maxLeverage: number;
  markPx: number;
  prevDayPx: number;
  /** Hourly funding rate. Positive means longs pay shorts. */
  funding: number;
  dayVolumeUsd: number;
  openInterest: number;
};

export async function getMarkets(): Promise<Market[]> {
  const [meta, ctxs] = await info.metaAndAssetCtxs();
  return meta.universe
    .map((u, index) => {
      const c = ctxs[index];
      return {
        name: u.name,
        index,
        szDecimals: u.szDecimals,
        maxLeverage: u.maxLeverage,
        markPx: Number(c?.markPx ?? 0),
        prevDayPx: Number(c?.prevDayPx ?? 0),
        funding: Number(c?.funding ?? 0),
        dayVolumeUsd: Number(c?.dayNtlVlm ?? 0),
        openInterest: Number(c?.openInterest ?? 0),
        delisted: Boolean(u.isDelisted),
      };
    })
    .filter((m) => !m.delisted && m.markPx > 0)
    .map(({ delisted: _d, ...m }) => m)
    .sort((a, b) => b.dayVolumeUsd - a.dayVolumeUsd);
}

export type LivePosition = {
  coin: string;
  side: "long" | "short";
  size: number;
  entryPx: number;
  leverage: number;
  marginUsed: number;
  unrealizedPnl: number;
  liqPx: number | null;
  stopPx: number | null;
  stopOid: number | null;
  tpPx: number | null;
};

export type AccountState = { accountValue: number; withdrawable: number; positions: LivePosition[] };

export async function getAccountState(user: `0x${string}`): Promise<AccountState> {
  const [state, orders] = await Promise.all([
    info.clearinghouseState({ user }),
    info.frontendOpenOrders({ user }),
  ]);
  const positions = state.assetPositions
    .map(({ position: p }) => {
      const size = Number(p.szi);
      const side = size >= 0 ? "long" : "short";
      const triggers = orders.filter((o) => o.coin === p.coin && o.isTrigger && o.reduceOnly);
      const sl = triggers.find((o) => o.orderType.startsWith("Stop"));
      const tp = triggers.find((o) => o.orderType.startsWith("Take Profit"));
      return {
        coin: p.coin,
        side,
        size: Math.abs(size),
        entryPx: Number(p.entryPx),
        leverage: Number(p.leverage.value),
        marginUsed: Number(p.marginUsed),
        unrealizedPnl: Number(p.unrealizedPnl),
        liqPx: p.liquidationPx ? Number(p.liquidationPx) : null,
        stopPx: sl ? Number(sl.triggerPx) : null,
        stopOid: sl ? sl.oid : null,
        tpPx: tp ? Number(tp.triggerPx) : null,
      } satisfies LivePosition;
    })
    .filter((p) => p.size > 0);
  return {
    accountValue: Number(state.marginSummary.accountValue),
    withdrawable: Number(state.withdrawable),
    positions,
  };
}

/** Realized profit or loss (after fees) since local midnight, used for the daily loss limit. */
export async function getTodayPnl(user: `0x${string}`): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fills = await info.userFillsByTime({ user, startTime: start.getTime() });
  return fills.reduce((sum, f) => sum + Number(f.closedPnl) - Number(f.fee), 0);
}

export async function getMids(): Promise<Record<string, number>> {
  const mids = await info.allMids();
  return Object.fromEntries(Object.entries(mids).map(([k, v]) => [k, Number(v)]));
}

/**
 * Hyperliquid perp prices allow at most 5 significant figures and at most
 * (6 - szDecimals) decimals. Whole numbers are always allowed.
 */
export function formatPrice(px: number, szDecimals: number): string {
  if (!Number.isFinite(px) || px <= 0) throw new Error("Price must be a positive number");
  const maxDecimals = Math.max(0, 6 - szDecimals);
  const rounded = Number(Number(px.toPrecision(5)).toFixed(maxDecimals));
  return trimZeros(rounded.toFixed(maxDecimals));
}

/** Sizes round down so a job never exceeds the plan. */
export function formatSize(size: number, szDecimals: number): string {
  const f = 10 ** szDecimals;
  return trimZeros((Math.floor(size * f) / f).toFixed(szDecimals));
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export type CandleRange = "1H" | "4H" | "1D" | "1W";
const CANDLE_SETTINGS = {
  "1H": { interval: "1m", ms: 3_600_000 },
  "4H": { interval: "5m", ms: 4 * 3_600_000 },
  "1D": { interval: "15m", ms: 86_400_000 },
  "1W": { interval: "2h", ms: 7 * 86_400_000 },
} as const;

export type Candle = {
  t: number;
  /** Closing price. */
  c: number;
  /** Traded volume in USD (base volume times close). */
  vUsd: number;
  /** Price closed at or above the open. */
  up: boolean;
};

/** Candles for a price chart, oldest first. */
export async function getCandles(coin: string, range: CandleRange): Promise<Candle[]> {
  const { interval, ms } = CANDLE_SETTINGS[range];
  const now = Date.now();
  const candles = await info.candleSnapshot({ coin, interval, startTime: now - ms, endTime: now });
  return candles
    .map((k) => ({ t: k.t, c: Number(k.c), vUsd: Number(k.v) * Number(k.c), up: Number(k.c) >= Number(k.o) }))
    .filter((k) => k.c > 0);
}

export type LiveTrade = { tid: number; t: number; usd: number; buy: boolean };

let subs: SubscriptionClient | null = null;

/**
 * Streams every trade on one market. `buy` is true when the taker bought (a market buy).
 * Browser only. Returns a function that stops the stream.
 */
export function watchTrades(coin: string, onTrades: (trades: LiveTrade[]) => void): () => void {
  subs ??= new SubscriptionClient({ transport: new WebSocketTransport({ isTestnet: IS_TESTNET }) });
  let stopped = false;
  let stop: (() => Promise<void>) | null = null;
  subs
    .trades({ coin }, (data) => {
      if (stopped) return;
      onTrades(data.map((d) => ({ tid: d.tid, t: d.time, usd: Number(d.px) * Number(d.sz), buy: d.side === "B" })));
    })
    .then((sub) => {
      if (stopped) void sub.unsubscribe().catch(() => {});
      else stop = () => sub.unsubscribe();
    })
    .catch((e) => console.error("Trade stream failed", e));
  return () => {
    stopped = true;
    void stop?.().catch(() => {});
  };
}
