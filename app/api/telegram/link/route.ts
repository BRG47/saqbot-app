import { randomBytes } from "crypto";
import { errorResponse, requireUser } from "../../../../lib/server/auth";
import { sql } from "../../../../lib/server/db";

/** Creates a one-time code. Opening the returned link in Telegram links the chat to this account. */
export async function POST(req: Request) {
  try {
    const id = await requireUser(req);
    const code = randomBytes(12).toString("hex");
    await sql`insert into users (id) values (${id}) on conflict do nothing`;
    await sql`insert into telegram_links (code, user_id, expires_at) values (${code}, ${id}, now() + interval '15 minutes')`;
    const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "Trade_SaqBot";
    return Response.json({ url: `https://t.me/${bot}?start=${code}` });
  } catch (e) {
    return errorResponse(e);
  }
}
