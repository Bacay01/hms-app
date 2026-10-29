// Module 5.7 — Min-Heap (priority queue).
// A complete binary tree stored in an array, where every parent <= its children.
// For the item at index i: parent = (i - 1) >> 1, left = 2i + 1, right = 2i + 2.
// push / pop: O(log n)   peek: O(1)

export class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.a = [];
    this.cmp = compare;
  }

  size() {
    return this.a.length;
  }

  isEmpty() {
    return this.a.length === 0;
  }

  peek() {                               // O(1) — smallest item is always at the root
    return this.a.length ? this.a[0] : null;
  }

  push(x) {                              // O(log n)
    this.a.push(x);
    let i = this.a.length - 1;
    while (i > 0) {                      // bubble up while smaller than the parent
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
    return this;
  }

  pop() {                                // O(log n) — remove and return the smallest
    if (!this.a.length) return null;
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      while (true) {                     // sink down to the smaller child
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l;
        if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }

  // All items smallest → largest, WITHOUT emptying this heap. O(n log n)
  toSortedArray() {
    const copy = new MinHeap(this.cmp);
    copy.a = [...this.a];
    const out = [];
    while (!copy.isEmpty()) out.push(copy.pop());
    return out;
  }
}
