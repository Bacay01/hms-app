// Public "request an appointment" form — pure validation, no database (tested in __tests__/bookingRequest.test.js)
import { normalizeNgPhone } from "@/lib/reminderText";
import { shiftDate } from "@/lib/time";

export const TIME_SLOTS = {
  MORNING: "Morning (8am – 12pm)",
  AFTERNOON: "Afternoon (12pm – 4pm)",
};
export const MAX_DAYS_AHEAD = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAME_RE = /^\p{L}[\p{L} .'-]*$/u;

// A real calendar date? ("2026-02-31" is not)
function isRealDate(iso) {
  if (!DATE_RE.test(iso)) return false;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
}

export function parseBookingRequest(input, { today, departmentIds }) {
  const get = (k) => String(input[k] ?? "").trim();

  // Honeypot: a hidden field people never see. Bots fill every field.
  if (get("website")) return { spam: true };

  const errors = {};

  const fullName = get("fullName").replace(/\s+/g, " ");
  if (fullName.length < 3 || fullName.length > 80 || !NAME_RE.test(fullName) || !fullName.includes(" ")) {
    errors.fullName = "Enter your first and last name.";
  }

  const phone = normalizeNgPhone(get("phone"));
  if (!phone) errors.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";

  const departmentId = get("departmentId") || null;
  if (departmentId && !departmentIds.includes(departmentId)) errors.departmentId = "Choose a department from the list.";

  const preferredDate = get("preferredDate");
  if (!isRealDate(preferredDate)) errors.preferredDate = "Choose a date.";
  else if (preferredDate < today) errors.preferredDate = "Choose today or a later date.";
  else if (preferredDate > shiftDate(today, MAX_DAYS_AHEAD)) {
    errors.preferredDate = `Choose a date within the next ${MAX_DAYS_AHEAD} days.`;
  }

  const preferredTime = get("preferredTime");
  if (!Object.hasOwn(TIME_SLOTS, preferredTime)) errors.preferredTime = "Choose morning or afternoon.";

  const reason = get("reason");
  if (reason.length > 300) errors.reason = "Keep it under 300 characters.";

  if (input.consent !== "on") errors.consent = "Tick the box so we can contact you.";

  if (Object.keys(errors).length) return { errors };
  return { data: { fullName, phone, departmentId, preferredDate, preferredTime, reason: reason || null } };
}

// Short enough to read over the phone: "REQ-7K2M9A"
export const requestReference = (id) => `REQ-${id.slice(-6).toUpperCase()}`;

// "+2348031234567" → "08031234567" (how reception types numbers into patient search)
export const localPhone = (phone) => (phone?.startsWith("+234") ? `0${phone.slice(4)}` : phone);
