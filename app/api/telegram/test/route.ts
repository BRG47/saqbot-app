import { errorResponse, HttpError, requireUser } from "../../../../lib/server/auth";
import { sql } from "../../../../lib/server/db";
import { sendTelegram } from "../../../../lib/server/notify";

/** Sends a sample alert to the user's linked Telegram chat, so they can see what alerts look like. */
export async function POST(req: Request) {
  try {
    const id = await requireUser(req);
    const [u] = await sql<{ telegram_chat_id: string | null }[]>`select telegram_chat_id from users where id = ${id}`;
    if (!u?.telegram_chat_id) throw new HttpError(400, "Link Telegram first.");
    await sendTelegram(
      u.telegram_chat_id,
      "★★★★☆  <b>TEST ALERT</b>\n<b>This is what a heat alert looks like</b>\n\nETH long is 0.8% from your stop at 3,412.\nIf it hits, the loss stays what you planned.\n\n<i>Real alerts come with a button to open the job in SaqBot.</i>",
      { label: "Open my jobs", path: "/jobs" },
    );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
