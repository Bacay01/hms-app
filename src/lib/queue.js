// Queue and triage rules — pure, safe on server and client

export const ACTIVE_STATUSES = ["WAITING", "WITH_NURSE", "WITH_DOCTOR"];
export const LONG_WAIT_MINUTES = 120;

export const PRIORITIES = [
  { value: "EMERGENCY", label: "Emergency" },
  { value: "URGENT", label: "Urgent" },
  { value: "NORMAL", label: "Normal" },
];

export const VISIT_TYPES = [
  { value: "NEW", label: "New" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "REVIEW", label: "Review" },
  { value: "ANTENATAL", label: "Antenatal" },
];

export const ENCOUNTER_STATUS_LABELS = {
  WAITING: "Waiting",
  WITH_NURSE: "With nurse",
  WITH_DOCTOR: "With doctor",
  COMPLETED: "Done",
  LEFT: "Left without being seen",
  CANCELLED: "Removed",
};

export const APPOINTMENT_STATUS_LABELS = {
  BOOKED: "Booked",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

// Who can triage (change priority) and reassign patients between doctors
export const TRIAGE_PERMISSIONS = ["vitals.write"];
export const REASSIGN_PERMISSIONS = ["encounters.create", "vitals.write"];

// Allowed moves from each status, and the permissions that allow each one.
// "confirm" moves are tucked under "More options" and ask before running.
export const TRANSITIONS = {
  WAITING: [
    { to: "WITH_NURSE", label: "Call to nurse", permissions: ["vitals.write"] },
    { to: "WITH_DOCTOR", label: "Send to doctor", permissions: ["clinical.write"] },
    { to: "LEFT", label: "Left without being seen", permissions: ["encounters.create", "vitals.write"], confirm: true },
    { to: "CANCELLED", label: "Remove (added by mistake)", permissions: ["encounters.create"], confirm: true },
  ],
  WITH_NURSE: [
    { to: "WITH_DOCTOR", label: "Send to doctor", permissions: ["vitals.write"] },
    { to: "LEFT", label: "Left without being seen", permissions: ["encounters.create", "vitals.write"], confirm: true },
  ],
  WITH_DOCTOR: [{ to: "COMPLETED", label: "Complete visit", permissions: ["clinical.write"] }],
};

export function canAny(permissions = [], needed = []) {
  return needed.some((p) => permissions.includes(p));
}

export function allowedTransitions(status, permissions = []) {
  return (TRANSITIONS[status] ?? []).filter((t) => canAny(permissions, t.permissions));
}

export function labelOf(list, value) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function formatWait(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
