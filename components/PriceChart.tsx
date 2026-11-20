"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTradeFlow } from "../lib/client/flow";
import { getCandles, type Candle, type CandleRange } from "../lib/hyperliquid";
import { px } from "./ui";

type Level = { label: string; price: number | null | undefined; color: string };

const W = 340;
const H = 176;
const PAD = { top: 10, right: 6, bottom: 18, left: 6 };
/** Height of the volume bars under the price line. */
const VOL_H = 24;
/** Bottom edge of the price area, above the volume bars. */
const PRICE_BOTTOM = H - PAD.bottom - VOL_H - 4;
const RANGES: CandleRange[] = ["1H", "4H", "1D", "1W"];

/**
 * Live Hyperliquid price chart for one market, with the job's entry, stop, take-profit
 * and liquidation drawn as labeled lines. The last point is the current mark price.
 */
export function PriceChart({ coin, mark, levels }: { coin: string; mark: number; levels: Level[] }) {
  const [range, setRange] = useState<CandleRange>("1D");
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();
  const candles = useQuery({
    queryKey: ["candles", coin, range],
    queryFn: () => getCandles(coin, range),
    refetchInterval: range === "1H" ? 15_000 : range === "4H" ? 30_000 : 60_000,
  });

  const bars = candles.data ?? [];
  const pts: Pick<Candle, "t" | "c">[] = [...bars];
  if (pts.length && mark > 0) pts.push({ t: Date.now(), c: mark });

  const shown = levels.filter((l): l is Level & { price: number } => Boolean(l.price && l.price > 0));
  const prices = pts.map((p) => p.c);
  // Scale to the price action plus entry/stop/take-profit; liquidation only if it's close enough not to flatten the line.
  const core = [...prices, ...shown.filter((l) => l.label !== "Liq").map((l) => l.price)];
  let lo = Math.min(...core);
  let hi = Math.max(...core);
  const liq = shown.find((l) => l.label === "Liq");
  if (liq && liq.price > lo - (hi - lo) * 0.6 && liq.price < hi + (hi - lo) * 0.6) {
    lo = Math.min(lo, liq.price);
    hi = Math.max(hi, liq.price);
  }
  const span = hi - lo || hi * 0.01 || 1;
  lo -= span * 0.06;
  hi += span * 0.06;

  const t0 = pts[0]?.t ?? 0;
  const t1 = pts[pts.length - 1]?.t ?? 1;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * (PRICE_BOTTOM - PAD.top);
  const maxVol = Math.max(...bars.map((b) => b.vUsd), 0) || 1;
  const barW = Math.max(1, ((W - PAD.left - PAD.right) / Math.max(bars.length, 1)) * 0.7);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.c).toFixed(1)}`).join("");
  const first = prices[0] ?? 0;
  const up = mark >= first;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pts.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const tx = t0 + (((e.clientX - r.left) / r.width) * W - PAD.left) / (W - PAD.left - PAD.right) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - tx) < Math.abs(pts[best].t - tx)) best = i;
    setHover(best);
  }

  const hp = hover !== null ? pts[hover] : null;
  const fmtTime = (t: number) =>
    new Date(t).toLocaleString("en-US", range === "1W" ? { weekday: "short", hour: "numeric" } : { hour: "numeric", minute: "2-digit" });

  return (
    <div className="chart-wrap">
      <div className="row" style={{ paddingBottom: 4 }}>
        <span className="tiny">
          {hp ? (
            <>{fmtTime(hp.t)}: <b className="num" style={{ color: "var(--ink)" }}>{px(hp.c)}</b></>
          ) : (
            <>Mark <b className="num" style={{ color: "var(--ink)" }}>{px(mark)}</b>{first > 0 && <span className={up ? "up" : "down"}> {up ? "+" : ""}{(((mark - first) / first) * 100).toFixed(2)}%</span>}</>
          )}
        </span>
        <span className="chips" role="radiogroup" aria-label="Chart range" style={{ gap: 4 }}>
          {RANGES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} aria-pressed={range === r} className="chip" style={{ minHeight: 28, padding: "0 10px", fontSize: 12 }} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </span>
      </div>
      {candles.isError && <p className="tiny">Couldn&apos;t load the chart. Retrying…</p>}
      {pts.length > 1 ? (
        <svg
          className="chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${coin} price over the last ${range === "1H" ? "hour" : range === "4H" ? "4 hours" : range === "1D" ? "day" : "week"}, now ${px(mark)}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: "pan-y" }}
        >
          <defs>
            <clipPath id={clipId}><rect x={0} y={0} width={W} height={PRICE_BOTTOM + 2} /></clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + f * (PRICE_BOTTOM - PAD.top)} y2={PAD.top + f * (PRICE_BOTTOM - PAD.top)} stroke="var(--line)" strokeWidth={1} />
          ))}
          <g clipPath={`url(#${clipId})`}>
            {shown.map((l) => {
              const inside = l.price >= lo && l.price <= hi;
              const yy = inside ? y(l.price) : l.price < lo ? PRICE_BOTTOM - 1 : PAD.top + 1;
              return (
                <g key={l.label}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke={l.color} strokeWidth={1} strokeDasharray={inside ? "4 3" : "1 3"} opacity={0.9} />
                  <text x={PAD.left + 2} y={yy - 3} fontSize={10} fill="var(--ink-2)">
                    {l.label} {inside ? px(l.price) : `${l.price < lo ? "↓" : "↑"} ${px(l.price)}`}
                  </text>
                </g>
              );
            })}
            <path d={line} fill="none" stroke="var(--neon)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {bars.map((b) => {
            const h = Math.max(1, (b.vUsd / maxVol) * VOL_H);
            return (
              <rect key={b.t} x={x(b.t) - barW / 2} y={H - PAD.bottom - h} width={barW} height={h} fill={b.up ? "var(--up)" : "var(--down)"} opacity={0.45} />
            );
          })}
          <circle cx={x(pts[pts.length - 1].t)} cy={y(mark)} r={4} fill="var(--neon)" stroke="var(--panel-2)" strokeWidth={2} />
          {hp && (
            <>
              <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeWidth={1} />
              <circle cx={x(hp.t)} cy={y(hp.c)} r={4} fill="var(--panel-2)" stroke="var(--neon)" strokeWidth={2} />
            </>
          )}
          <text x={PAD.left} y={H - 4} fontSize={10} fill="var(--muted)">{fmtTime(t0)}</text>
          <text x={W - PAD.right} y={H - 4} fontSize={10} fill="var(--muted)" textAnchor="end">Now</text>
        </svg>
      ) : (
        !candles.isError && <p className="tiny" style={{ height: 140, display: "grid", placeItems: "center" }}>Loading {coin} chart…</p>
      )}
      <LiveFlow coin={coin} />
    </div>
  );
}

const compactUsd = (n: number) => "$" + n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: n >= 1000 ? 1 : 0 });

/** Market buys vs market sells on Hyperliquid over the last few minutes, streamed live. */
function LiveFlow({ coin }: { coin: string }) {
  const { buyUsd, sellUsd, coveredMs } = useTradeFlow(coin);
  const total = buyUsd + sellUsd;
  const buyPct = total > 0 ? Math.round((buyUsd / total) * 100) : 50;
  const mins = Math.max(1, Math.round(coveredMs / 60_000));
  return (
    <div className="flow" aria-live="off">
      <div className="row">
        <span className="tiny">Live flow, last {mins} min</span>
        <span className="tiny">{total > 0 ? `${compactUsd(buyUsd)} bought • ${compactUsd(sellUsd)} sold` : "Waiting for trades…"}</span>
      </div>
      <div
        className="flow-bar"
        role="img"
        aria-label={total > 0 ? `${buyPct}% of ${coin} volume in the last ${mins} minutes was market buys, ${100 - buyPct}% market sells` : "No trades yet"}
      >
        <span className="flow-buy" style={{ width: `${buyPct}%` }} />
        <span className="flow-sell" style={{ width: `${100 - buyPct}%` }} />
      </div>
      <div className="row tiny">
        <span className="up">Buyers {total > 0 ? `${buyPct}%` : "–"}</span>
        <span className="down">{total > 0 ? `${100 - buyPct}%` : "–"} Sellers</span>
      </div>
    </div>
  );
}
