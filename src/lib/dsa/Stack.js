// Module 3 — Stack (LIFO). The last item pushed is the first popped.
// A JS array's push/pop work on the END, so both are O(1).
// Used for: undo of queue actions (3B-3).

export class Stack {
  constructor(iterable = []) {
    this.items = [...iterable];
  }

  push(x) {                              // O(1)
    this.items.push(x);
    return this;
  }

  pop() {                                // O(1)
    return this.items.length ? this.items.pop() : null;
  }

  peek() {                               // O(1)
    return this.items.length ? this.items[this.items.length - 1] : null;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  toArray() {                            // bottom → top
    return [...this.items];
  }
}
