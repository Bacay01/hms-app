// Everything clinical runs on Lagos time, even when the server runs in UTC (e.g. Vercel)

export const TIME_ZONE = "Africa/Lagos";
export const TZ_OFFSET = "+01:00"; // Lagos has no daylight saving time
export const SLOT_MINUTES = 15;
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hm = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "2026-10-28" for the given moment, in Lagos
export function localDate(date = new Date()) {
  return ymd.format(date);
}

// "09:30" for the given moment, in Lagos
export function localTime(date = new Date()) {
  return hm.format(new Date(date));
}

// 0 = Sunday ... 6 = Saturday, in Lagos
export function localDayOfWeek(date = new Date()) {
  return new Date(`${localDate(date)}T12:00:00${TZ_OFFSET}`).getUTCDay();
}

// Start and end of a Lagos calendar day, as real moments in time
export function dayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00${TZ_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// "2026-10-28" shifted by n days
export function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00${TZ_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return localDate(d);
}

// Value from <input type="datetime-local"> ("2026-10-28T10:30"), read as Lagos time
export function parseLocalDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}
