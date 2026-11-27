// Helpers for the public homepage (tested in __tests__/landing.test.js)

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "08:00" → "8am", "15:30" → "3:30pm"
export function formatHour(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

// Days in a row become a range: [1,2,3,4,5] → "Mon–Fri"; [1,3,5] → "Mon, Wed, Fri"
export function formatDays(days) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j - i >= 2 ? `${SHORT_DAYS[sorted[i]]}–${SHORT_DAYS[sorted[j]]}` : sorted.slice(i, j + 1).map((d) => SHORT_DAYS[d]).join(", "));
    i = j + 1;
  }
  return parts.join(", ");
}

// A doctor's weekly schedule as short lines, grouping days that share the same hours.
// [{dayOfWeek:1,startTime:"09:00",endTime:"15:00"}, {dayOfWeek:3,...same}] → ["Mon, Wed · 9am–3pm"]
export function summariseSchedule(schedules) {
  const byHours = new Map(); // "09:00-15:00" → [days]
  for (const s of schedules) {
    const key = `${s.startTime}-${s.endTime}`;
    if (!byHours.has(key)) byHours.set(key, []);
    byHours.get(key).push(s.dayOfWeek);
  }
  return [...byHours.entries()]
    .sort(([, a], [, b]) => Math.min(...a) - Math.min(...b))
    .map(([key, days]) => {
      const [start, end] = key.split("-");
      return `${formatDays(days)} · ${formatHour(start)}–${formatHour(end)}`;
    });
}

// "Amaka Obi" → "AO"
export const initials = (first, last) => `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
