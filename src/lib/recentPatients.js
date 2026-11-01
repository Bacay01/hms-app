import { LRUCache } from "@/lib/dsa/LRUCache";

// views: [{ patientId, at }] in time order, OLDEST first.
// Replaying them through an LRU cache leaves the `capacity` most recently viewed
// DISTINCT patients — a repeat view just moves that patient to the front (O(1)).
export function recentFromViews(views, capacity = 8) {
  const cache = new LRUCache(capacity);
  for (const v of views) cache.set(v.patientId, v.at);
  return cache.entries().map(([patientId, at]) => ({ patientId, at }));
}
