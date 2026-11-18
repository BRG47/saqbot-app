import { errorResponse, HttpError, requireUser } from "../../../lib/server/auth";
import { sql } from "../../../lib/server/db";

export async function POST(req: Request) {
  try {
    const id = await requireUser(req);
    const sub = (await req.json()) as { endpoint?: string };
    if (!sub?.endpoint?.startsWith("https://")) throw new HttpError(400, "That notification subscription isn't valid.");
    await sql`insert into users (id) values (${id}) on conflict do nothing`;
    await sql`
      insert into push_subscriptions (endpoint, user_id, subscription) values (${sub.endpoint}, ${id}, ${sql.json(sub as never)})
      on conflict (endpoint) do update set user_id = ${id}, subscription = ${sql.json(sub as never)}`;
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = await requireUser(req);
    await sql`delete from push_subscriptions where user_id = ${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
