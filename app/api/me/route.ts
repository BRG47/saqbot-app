import { errorResponse, HttpError, requireUser } from "../../../lib/server/auth";
import { sql } from "../../../lib/server/db";

const REPS = ["novice", "intermediate", "advanced", "lookout"];

export async function GET(req: Request) {
  try {
    const id = await requireUser(req);
    const [row] = await sql<{ rep: string | null; alerts: unknown; telegram_chat_id: string | null }[]>`
      select rep, alerts, telegram_chat_id from users where id = ${id}`;
    return Response.json({ rep: row?.rep ?? null, alerts: row?.alerts ?? null, telegramLinked: Boolean(row?.telegram_chat_id) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Saves rep, alert settings and trading wallet so the alert worker knows what to watch. */
export async function PUT(req: Request) {
  try {
    const id = await requireUser(req);
    const body = (await req.json()) as { rep?: string; alerts?: Record<string, unknown>; wallet?: string };
    if (body.rep && !REPS.includes(body.rep)) throw new HttpError(400, "Unknown rep level.");
    if (body.wallet && !/^0x[0-9a-fA-F]{40}$/.test(body.wallet)) throw new HttpError(400, "That wallet address isn't valid.");
    const alerts = body.alerts ? sql.json(body.alerts as never) : null;
    await sql`
      insert into users (id, rep, alerts, wallet)
      values (${id}, ${body.rep ?? null}, ${alerts ?? sql.json({})}, ${body.wallet?.toLowerCase() ?? null})
      on conflict (id) do update set
        rep = coalesce(${body.rep ?? null}, users.rep),
        alerts = coalesce(${alerts}, users.alerts),
        wallet = coalesce(${body.wallet?.toLowerCase() ?? null}, users.wallet)`;
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
