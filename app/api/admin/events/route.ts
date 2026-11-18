import { EVENT_TYPES } from "../../../../lib/events";
import { sql } from "../../../../lib/server/db";

/**
 * Adds a scheduled event. Protected by ADMIN_TOKEN.
 * curl -X POST https://saqbot.xyz/api/admin/events -H "authorization: Bearer $ADMIN_TOKEN" \
 *   -H "content-type: application/json" -d '{"type":"cpi","title":"US inflation report (CPI)","startsAt":"2026-12-10T13:30:00Z"}'
 */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  const b = (await req.json()) as { type?: string; title?: string; detail?: string; coin?: string; startsAt?: string };
  if (!b.type || !(b.type in EVENT_TYPES)) return Response.json({ error: `type must be one of: ${Object.keys(EVENT_TYPES).join(", ")}` }, { status: 400 });
  const when = b.startsAt ? new Date(b.startsAt) : null;
  if (!when || Number.isNaN(when.getTime())) return Response.json({ error: "startsAt must be an ISO date." }, { status: 400 });
  const [row] = await sql`
    insert into market_events (type, title, detail, coin, starts_at)
    values (${b.type}, ${b.title ?? EVENT_TYPES[b.type as keyof typeof EVENT_TYPES].label}, ${b.detail ?? null}, ${b.coin ?? null}, ${when})
    returning id`;
  return Response.json({ id: row.id });
}
