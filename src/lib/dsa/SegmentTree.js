// Segment tree for range SUMS over a fixed-length array (iterative, bottom-up).
// Leaves live at tree[n..2n-1]; each parent holds the sum of its two children.
// build: O(n) · query(l, r) inclusive: O(log n) · update(i, value): O(log n)
export class SegmentTree {
  constructor(values) {
    this.n = values.length;
    this.tree = new Array(2 * this.n).fill(0);
    for (let i = 0; i < this.n; i++) this.tree[this.n + i] = values[i];
    for (let i = this.n - 1; i > 0; i--) this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1];
  }

  update(index, value) {
    let i = index + this.n;
    this.tree[i] = value;
    for (i >>= 1; i >= 1; i >>= 1) this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1];
  }

  // Sum of values[l..r], both ends included. Out-of-range bounds are clipped.
  query(l, r) {
    l = Math.max(0, l);
    r = Math.min(this.n - 1, r);
    if (l > r) return 0;
    let sum = 0;
    for (l += this.n, r += this.n + 1; l < r; l >>= 1, r >>= 1) {
      if (l & 1) sum += this.tree[l++];
      if (r & 1) sum += this.tree[--r];
    }
    return sum;
  }
}
