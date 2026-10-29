// Module 4.6 — LRU (Least Recently Used) cache = Hash Map + Doubly Linked List.
//   Map:         key → node, so lookup is O(1)
//   Linked list: most recent at the head, least recent at the tail,
//                so moving or evicting a node is O(1)
// Used for: "Recently viewed patients" (3B-4).

class DNode {
  constructor(value) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

export class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Capacity must be a positive integer");
    }
    this.cap = capacity;
    this.map = new Map();                // key → node
    this.head = new DNode(null);         // sentinel: most recent side
    this.tail = new DNode(null);         // sentinel: least recent side
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _unlink(n) {
    n.prev.next = n.next;
    n.next.prev = n.prev;
  }

  _addFront(n) {
    n.next = this.head.next;
    n.prev = this.head;
    this.head.next.prev = n;
    this.head.next = n;
  }

  get(key) {                             // O(1) — also marks it as recently used
    const n = this.map.get(key);
    if (!n) return null;
    this._unlink(n);
    this._addFront(n);
    return n.value.val;
  }

  set(key, val) {                        // O(1)
    if (this.map.has(key)) {
      const n = this.map.get(key);
      n.value.val = val;
      this._unlink(n);
      this._addFront(n);
      return this;
    }
    if (this.map.size === this.cap) {
      const lru = this.tail.prev;        // evict the least recently used
      this._unlink(lru);
      this.map.delete(lru.value.key);
    }
    const n = new DNode({ key, val });
    this._addFront(n);
    this.map.set(key, n);
    return this;
  }

  has(key) {
    return this.map.has(key);
  }

  size() {
    return this.map.size;
  }

  // Most recent → least recent. O(n). Does NOT change the order.
  entries() {
    const out = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      out.push([cur.value.key, cur.value.val]);
      cur = cur.next;
    }
    return out;
  }

  keys() {
    return this.entries().map(([k]) => k);
  }
}
