import { ExchangeClient } from "@nktkas/hyperliquid";
import type { PrivateKeyAccount } from "viem/accounts";
import { BUILDER_ADDRESS, ENTRY_SLIPPAGE, TRIGGER_SLIPPAGE } from "./config";
import { formatPrice, formatSize, transport, type LivePosition, type Market } from "./hyperliquid";
import type { Side } from "./planner";

type OrderSpec = Parameters<ExchangeClient["order"]>[0]["orders"][number];

export type JobParams = {
  market: Market;
  side: Side;
  size: number;
  leverage: number;
  /** null means full send: no stop-loss. */
  stop: number | null;
  takeProfit: number | null;
  /** Builder fee in tenths of a bp. 0 for BAWSAQ holders. */
  builderFee: number;
};

const exchangeFor = (agent: PrivateKeyAccount) => new ExchangeClient({ transport, wallet: agent });
const builderFor = (fee: number) => (BUILDER_ADDRESS && fee > 0 ? { builder: { b: BUILDER_ADDRESS, f: fee } } : {});

function failIfAny(statuses: unknown[]) {
  const failed = statuses.find((s) => typeof s === "object" && s !== null && "error" in s) as { error: string } | undefined;
  if (failed) throw new Error(failed.error);
}

function exitOrder(market: Market, isBuyEntry: boolean, size: string, trigger: number, kind: "sl" | "tp"): OrderSpec {
  const limit = trigger * (isBuyEntry ? 1 - TRIGGER_SLIPPAGE : 1 + TRIGGER_SLIPPAGE);
  return {
    a: market.index,
    b: !isBuyEntry,
    p: formatPrice(limit, market.szDecimals),
    s: size,
    r: true,
    t: { trigger: { isMarket: true, triggerPx: formatPrice(trigger, market.szDecimals), tpsl: kind } },
  };
}

/**
 * Opens a job at market. With a stop, the stop-loss (and take-profit) go out in the
 * same action, linked with "normalTpsl" so they activate when the entry fills.
 * Full send sends the entry alone (plus take-profit if set).
 */
export async function placeJob(agent: PrivateKeyAccount, p: JobParams) {
  const exchange = exchangeFor(agent);
  const isBuy = p.side === "long";
  const { index: a, szDecimals, markPx } = p.market;
  const s = formatSize(p.size, szDecimals);
  if (Number(s) <= 0) throw new Error("Position size rounds to zero for this market.");

  await exchange.updateLeverage({ asset: a, isCross: false, leverage: Math.floor(p.leverage) });

  const entryLimit = markPx * (isBuy ? 1 + ENTRY_SLIPPAGE : 1 - ENTRY_SLIPPAGE);
  const orders: OrderSpec[] = [
    { a, b: isBuy, p: formatPrice(entryLimit, szDecimals), s, r: false, t: { limit: { tif: "Ioc" } } },
  ];
  if (p.stop) orders.push(exitOrder(p.market, isBuy, s, p.stop, "sl"));
  if (p.takeProfit) orders.push(exitOrder(p.market, isBuy, s, p.takeProfit, "tp"));

  const result = await exchange.order({
    orders,
    grouping: orders.length > 1 ? "normalTpsl" : "na",
    ...builderFor(p.builderFee),
  });
  failIfAny(result.response.data.statuses as unknown[]);
}

/** Cashes out a whole position at market with a reduce-only order. */
export async function closePosition(agent: PrivateKeyAccount, market: Market, pos: LivePosition, builderFee: number) {
  const isBuy = pos.side === "short";
  const limit = market.markPx * (isBuy ? 1 + ENTRY_SLIPPAGE * 2 : 1 - ENTRY_SLIPPAGE * 2);
  const result = await exchangeFor(agent).order({
    orders: [
      {
        a: market.index,
        b: isBuy,
        p: formatPrice(limit, market.szDecimals),
        s: formatSize(pos.size, market.szDecimals),
        r: true,
        t: { limit: { tif: "Ioc" } },
      },
    ],
    grouping: "na",
    ...builderFor(builderFee),
  });
  failIfAny(result.response.data.statuses as unknown[]);
}

/** Replaces (or adds) the stop-loss on an open position. */
export async function moveStop(agent: PrivateKeyAccount, market: Market, pos: LivePosition, newStop: number) {
  const exchange = exchangeFor(agent);
  const dir = pos.side === "long" ? 1 : -1;
  if ((newStop - market.markPx) * dir >= 0) {
    throw new Error(pos.side === "long" ? "A long's stop has to sit below the current price." : "A short's stop has to sit above the current price.");
  }
  const result = await exchange.order({
    orders: [exitOrder(market, pos.side === "long", formatSize(pos.size, market.szDecimals), newStop, "sl")],
    grouping: "positionTpsl",
  });
  failIfAny(result.response.data.statuses as unknown[]);
  if (pos.stopOid !== null) await exchange.cancel({ cancels: [{ a: market.index, o: pos.stopOid }] });
}
