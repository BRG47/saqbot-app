"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { getCandles, type CandleRange } from "../lib/hyperliquid";
import { px } from "./ui";

type Level = { label: string; price: number | null | undefined; color: string };

const W = 340;
const H = 150;
const PAD = { top: 10, right: 6, bottom: 18, left: 6 };
const RANGES: CandleRange[] = ["1H", "1D", "1W"];

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
    refetchInterval: range === "1H" ? 15_000 : 60_000,
  });

  const pts = [...(candles.data ?? [])];
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
  const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
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
          aria-label={`${coin} price over the last ${range === "1H" ? "hour" : range === "1D" ? "day" : "week"}, now ${px(mark)}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: "pan-y" }}
        >
          <defs>
            <clipPath id={clipId}><rect x={0} y={0} width={W} height={H - PAD.bottom + 2} /></clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + f * (H - PAD.top - PAD.bottom)} y2={PAD.top + f * (H - PAD.top - PAD.bottom)} stroke="var(--line)" strokeWidth={1} />
          ))}
          <g clipPath={`url(#${clipId})`}>
            {shown.map((l) => {
              const inside = l.price >= lo && l.price <= hi;
              const yy = inside ? y(l.price) : l.price < lo ? H - PAD.bottom - 1 : PAD.top + 1;
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
        !candles.isError && <p className="tiny" style={{ height: 120, display: "grid", placeItems: "center" }}>Loading {coin} chart…</p>
      )}
    </div>
  );
}
