// Module 5 — Queue (FIFO), built on a singly linked list.
// enqueue and dequeue are both O(1). An array's shift() would be O(n) (Module 1).

class QNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export class Queue {
  constructor(iterable = []) {
    this.front = null;
    this.rear = null;
    this.length = 0;
    for (const v of iterable) this.enqueue(v);
  }

  enqueue(value) {                       // O(1) — join at the back
    const node = new QNode(value);
    if (!this.rear) this.front = this.rear = node;
    else {
      this.rear.next = node;
      this.rear = node;
    }
    this.length++;
    return this;
  }

  dequeue() {                            // O(1) — leave from the front
    if (!this.front) return null;
    const value = this.front.value;
    this.front = this.front.next;
    if (!this.front) this.rear = null;
    this.length--;
    return value;
  }

  peek() {                               // O(1)
    return this.front ? this.front.value : null;
  }

  isEmpty() {
    return this.length === 0;
  }

  size() {
    return this.length;
  }

  toArray() {                            // O(n)
    const out = [];
    let cur = this.front;
    while (cur) {
      out.push(cur.value);
      cur = cur.next;
    }
    return out;
  }
}
