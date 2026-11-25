// "0803 000 0002" / "2348030000002" / "+2348030000002" → "+2348030000002". Anything else → null.
export function normalizeNgPhone(raw) {
  const digits = String(raw ?? "").replace(/[\s\-()]/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+234[789][01]\d{8}$/.test(digits)) return digits;
  return null;
}

export const maskPhone = (phone) => (phone ? `${phone.slice(0, 8)}***${phone.slice(-3)}` : null);

// Who, when, where — never the reason for the visit (an SMS can be read by anyone holding the phone)
export function buildReminderMessage({ firstName, doctorLastName, room, scheduledAt, hospitalName }) {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(scheduledAt));
  return `Hello ${firstName}, reminder: your appointment with Dr ${doctorLastName} at ${hospitalName} is ${when}${room ? `, ${room}` : ""}. Call us to reschedule.`;
}
