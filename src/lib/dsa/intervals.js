// Scheduling with sorted intervals + binary search (Module 1: O(log n)).
// Each appointment is a fixed-length slot [start, start + duration).
// `sorted` is an ascending array of start times (milliseconds).

// Binary search: index of the first start >= target. O(log n)
export function lowerBound(sorted, target) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Two equal-length slots overlap when their starts are less than `duration` apart.
// Only the neighbours either side of the insertion point can overlap,
// so this is O(log n) instead of checking every appointment.
export function findOverlap(sorted, start, duration) {
  const i = lowerBound(sorted, start);
  if (i < sorted.length && sorted[i] - start < duration) return sorted[i];
  if (i > 0 && start - sorted[i - 1] < duration) return sorted[i - 1];
  return null;
}

// Earliest free start at or after `from`, no later than `latestStart`; null if the day is full.
// Each clash pushes the candidate to just after the clashing slot.
export function nextFreeSlot(sorted, from, duration, latestStart) {
  let start = from;
  while (start <= latestStart) {
    const clash = findOverlap(sorted, start, duration);
    if (clash === null) return start;
    start = clash + duration;
  }
  return null;
}
