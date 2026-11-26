import { FREQUENCIES } from "@/lib/prescribing";
import { daysUntil } from "@/lib/stock";

// Bed charges per stay, counted by NIGHTS (midnight census) at that stay's ward rate.
// stays: [{ id, wardName, rateKobo, fromDate "YYYY-MM-DD", toDate "YYYY-MM-DD" | null }]
// A same-day admission and discharge still pays one day.
export function bedChargeLines(stays, today) {
  const lines = [...stays]
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate))
    .map((s) => ({ stayId: s.id, wardName: s.wardName, rateKobo: s.rateKobo, nights: Math.max(0, daysUntil(s.toDate ?? today, s.fromDate)) }));
  if (lines.length && lines.every((l) => l.nights === 0)) lines[lines.length - 1].nights = 1;
  return lines.filter((l) => l.nights > 0);
}

// Medication chart: how many doses are expected today, given and still due
export function dosesToday(frequency, givenToday) {
  const expected = FREQUENCIES.find((f) => f.code === frequency)?.perDay ?? 1; // STAT = one dose
  return { expected, given: givenToday, remaining: Math.max(0, expected - givenToday) };
}
