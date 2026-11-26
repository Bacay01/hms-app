import { MinHeap } from "@/lib/dsa/MinHeap";

// The k largest items by score, largest first — O(n log k).
// Keep a min-heap of size k: its root is the weakest of the current top k, so anything smaller is skipped.
export function topK(items, k, score = (x) => x.count) {
  const heap = new MinHeap((a, b) => score(a) - score(b));
  for (const item of items) {
    heap.push(item);
    if (heap.size() > k) heap.pop(); // drop the smallest — it can't be in the top k
  }
  const out = [];
  while (!heap.isEmpty()) out.push(heap.pop());
  return out.reverse();
}
