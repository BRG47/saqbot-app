import webpush from "web-push";
import { sql } from "./db";

/** Sends a Telegram message, with an optional button that opens a SaqBot screen. */
export async function sendTelegram(chatId: number | string, text: string, button?: { label: string; path: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const appUrl = process.env.APP_URL ?? "https://saqbot.xyz";
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (button) body.reply_markup = { inline_keyboard: [[{ text: button.label, url: appUrl + button.path }]] };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("Telegram send failed", res.status, await res.text());
}

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@saqbot.xyz", pub, priv);
  vapidReady = true;
  return true;
}

/** Sends a push notification to every device the user registered. Removes dead subscriptions. */
export async function sendPush(userId: string, title: string, body: string, path = "/home") {
  if (!setupVapid()) return;
  const subs = await sql<{ endpoint: string; subscription: webpush.PushSubscription }[]>`
    select endpoint, subscription from push_subscriptions where user_id = ${userId}`;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, path }));
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`;
      }
    }),
  );
}

/** Records an alert key and returns false if it was already sent (so it isn't sent twice). */
export async function claimAlert(key: string): Promise<boolean> {
  const rows = await sql`insert into alerts_sent (key) values (${key}) on conflict do nothing returning key`;
  return rows.length > 0;
}
