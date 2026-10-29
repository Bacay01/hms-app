// Module 5.4 — Circular queue: fixed capacity, the end wraps around to the start.
// Uses a `count` field so capacity really means capacity (no wasted slot).
//
// Extra option `overwrite: true`: when full, drop the OLDEST item to make room.
// That turns it into a ring buffer that always holds the latest N items —
// used for the waiting-room TV's "last 5 numbers called" (3B-5).

export class CircularQueue {
  constructor(capacity, { overwrite = false } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Capacity must be a positive integer");
    }
    this.items = new Array(capacity);
    this.capacity = capacity;
    this.overwrite = overwrite;
    this.front = 0;
    this.rear = -1;
    this.count = 0;
  }

  isFull() {
    return this.count === this.capacity;
  }

  isEmpty() {
    return this.count === 0;
  }

  size() {
    return this.count;
  }

  enqueue(x) {                           // O(1)
    if (this.isFull()) {
      if (!this.overwrite) return false;
      this.dequeue();                    // ring buffer: make room by dropping the oldest
    }
    this.rear = (this.rear + 1) % this.capacity;
    this.items[this.rear] = x;
    this.count++;
    return true;
  }

  dequeue() {                            // O(1)
    if (this.isEmpty()) return null;
    const x = this.items[this.front];
    this.items[this.front] = undefined;
    this.front = (this.front + 1) % this.capacity;
    this.count--;
    return x;
  }

  peek() {                               // oldest item
    return this.isEmpty() ? null : this.items[this.front];
  }

  peekLast() {                           // newest item
    return this.isEmpty() ? null : this.items[this.rear];
  }

  toArray() {                            // oldest → newest
    const out = [];
    for (let i = 0; i < this.count; i++) {
      out.push(this.items[(this.front + i) % this.capacity]);
    }
    return out;
  }
}
