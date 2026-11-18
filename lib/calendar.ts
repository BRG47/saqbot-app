/**
 * Free calendar sources for 5-star events.
 *  - Jobs reports and CPI: the Bureau of Labor Statistics' public calendar file (auto-updated by BLS).
 *  - Fed rate decisions: the FOMC's published schedule, listed below. Update once a year.
 *  - Crypto options expiries: calculated (last Friday of each month, 08:00 UTC).
 * PCE, earnings, token unlocks and ETF decisions are still added by hand with /api/admin/events.
 */
import type { EventType } from "./events";

export type SyncedEvent = { sourceId: string; type: EventType; title: string; detail: string | null; startsAt: Date };

export const BLS_ICS_URL = "https://www.bls.gov/schedule/news_release/bls.ics";

/**
 * FOMC rate decisions: the statement comes out at 2:00 pm Eastern on the second day of each meeting.
 * Source: federalreserve.gov FOMC calendar. The Fed revised the 2027 schedule on Nov 12, 2026:
 * seven decision meetings, plus an Oct 26-27 strategy-only meeting with no rate decision (left out).
 * Add the next year's dates when the Fed publishes them; the worker logs a reminder when this list runs low.
 */
export const FOMC_DECISION_DAYS = [
  "2026-12-09",
  "2027-01-27",
  "2027-03-17",
  "2027-04-28",
  "2027-06-09",
  "2027-07-28",
  "2027-09-15",
  "2027-11-17",
];

/** Converts a wall-clock time in New York (Eastern Time, with daylight saving) to a UTC Date. */
export function easternToUtc(y: number, mo: number, d: number, h: number, mi: number): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wanted + 5 * 3_600_000; // EST is UTC-5; refined below for EDT
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** Minimal iCalendar reader: returns each event's UID, SUMMARY and start time. */
export function parseIcs(text: string): { uid: string | null; summary: string; start: Date }[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: { uid: string | null; summary: string; start: Date }[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const start = cur.DTSTART ? parseIcsDate(cur.DTSTART_PARAMS ?? "", cur.DTSTART) : null;
      if (start && cur.SUMMARY) out.push({ uid: cur.UID ?? null, summary: unescape(cur.SUMMARY), start });
      cur = null;
    } else if (cur) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [name, ...params] = line.slice(0, colon).split(";");
      cur[name.toUpperCase()] = line.slice(colon + 1);
      if (name.toUpperCase() === "DTSTART") cur.DTSTART_PARAMS = params.join(";");
    }
  }
  return out;
}

function unescape(s: string) {
  return s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Handles UTC ("...Z"), Eastern wall time (TZID or no zone) and date-only values (BLS releases at 8:30 am ET). */
function parseIcsDate(params: string, value: string): Date | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  if (h === undefined || /VALUE=DATE(?!-)/i.test(params)) return easternToUtc(+y, +mo, +d, 8, 30);
  return easternToUtc(+y, +mo, +d, +h, +mi);
}

/** Picks the BLS releases that move crypto: the jobs report and CPI. */
export function blsEvents(text: string): SyncedEvent[] {
  return parseIcs(text).flatMap((e) => {
    const period = e.summary.match(/\bfor (.+)$/i)?.[1] ?? null;
    let type: EventType | null = null;
    let title = "";
    if (/^employment situation/i.test(e.summary)) {
      type = "jobs";
      title = "US jobs report";
    } else if (/^consumer price index/i.test(e.summary)) {
      type = "cpi";
      title = "US inflation report (CPI)";
    }
    if (!type) return [];
    const day = e.start.toISOString().slice(0, 10);
    return [{ sourceId: `bls:${type}:${day}`, type, title, detail: period, startsAt: e.start }];
  });
}

export function fomcEvents(): SyncedEvent[] {
  return FOMC_DECISION_DAYS.map((day) => {
    const [y, mo, d] = day.split("-").map(Number);
    return { sourceId: `fomc:${day}`, type: "fed" as const, title: "Fed rate decision", detail: "Statement 2:00 pm ET, press conference after", startsAt: easternToUtc(y, mo, d, 14, 0) };
  });
}

/** Monthly crypto options expiries (last Friday, 08:00 UTC); March, June, September and December are quarterly. */
export function expiryEvents(from: Date, months = 4): SyncedEvent[] {
  const out: SyncedEvent[] = [];
  for (let i = 0; i < months; i++) {
    const y = from.getUTCFullYear();
    const mo = from.getUTCMonth() + i;
    const last = new Date(Date.UTC(y, mo + 1, 0));
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 2) % 7)); // back up to Friday
    const at = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate(), 8, 0));
    const quarterly = [2, 5, 8, 11].includes(at.getUTCMonth());
    out.push({
      sourceId: `expiry:${at.toISOString().slice(0, 10)}`,
      type: "expiry",
      title: quarterly ? "Quarterly options expiry" : "Monthly options expiry",
      detail: "Crypto options settle at 08:00 UTC",
      startsAt: at,
    });
  }
  return out;
}
