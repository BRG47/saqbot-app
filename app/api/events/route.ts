import { EVENT_TYPES, type EventType } from "../../../lib/events";
import { sql } from "../../../lib/server/db";

export const dynamic = "force-dynamic";

/** Upcoming 5-star events for the next 7 days, with their star ratings. Public. */
export async function GET() {
  try {
    const rows = await sql<{ id: number; type: EventType; title: string; detail: string | null; coin: string | null; starts_at: Date; stars: number | null }[]>`
      select e.id, e.type, e.title, e.detail, e.coin, e.starts_at, r.stars
      from market_events e left join event_ratings r on r.type = e.type
      where e.starts_at > now() and e.starts_at < now() + interval '7 days'
      order by e.starts_at`;
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        detail: r.detail,
        coin: r.coin,
        startsAt: r.starts_at.toISOString(),
        stars: r.stars ?? EVENT_TYPES[r.type]?.fallbackStars ?? 2,
      })),
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (e) {
    console.error(e);
    return Response.json([], { status: 200 });
  }
}
