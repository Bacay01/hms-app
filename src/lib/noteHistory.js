export const NOTE_FIELDS = [
  { key: "presentingComplaint", label: "Presenting complaint" },
  { key: "history", label: "History" },
  { key: "examination", label: "Examination" },
  { key: "plan", label: "Plan" },
];

// Note versions are a singly linked list: each version points to the one before (previousId).
// Rebuild it newest → oldest:
//   1. Map id → note for O(1) lookups
//   2. The head is the version nothing points back to
//   3. Floyd's tortoise-and-hare (Module 4.3C) rejects a corrupted, cyclic chain
//   4. Walk the previous pointers to the first draft
export function buildNoteHistory(notes) {
  if (notes.length === 0) return { versions: [], intact: true };

  const byVersion = () => [...notes].sort((a, b) => b.version - a.version);
  const byId = new Map(notes.map((n) => [n.id, n]));
  const pointedTo = new Set(notes.map((n) => n.previousId).filter(Boolean));
  const heads = notes.filter((n) => !pointedTo.has(n.id));
  if (heads.length !== 1) return { versions: byVersion(), intact: false };

  const prev = (n) => (n?.previousId ? byId.get(n.previousId) ?? null : null);

  let slow = heads[0];
  let fast = heads[0];
  while (fast && prev(fast)) {
    slow = prev(slow);
    fast = prev(prev(fast));
    if (slow && slow === fast) return { versions: byVersion(), intact: false };
  }

  const versions = [];
  for (let cur = heads[0]; cur; cur = prev(cur)) versions.push(cur);

  const tail = versions[versions.length - 1];
  return { versions, intact: versions.length === notes.length && !tail.previousId };
}

// Which sections changed compared with the previous version
export function changedFields(current, previous) {
  const keys = NOTE_FIELDS.map((f) => f.key);
  if (!previous) return keys.filter((k) => current[k]);
  return keys.filter((k) => (current[k] ?? null) !== (previous[k] ?? null));
}
