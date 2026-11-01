// Module 4 — Doubly linked list. Every node points to BOTH neighbours (prev and next).
// push / unshift / remove(node): O(1) · walk forwards from head or backwards from tail: O(n)
class DNode {
  constructor(value) {
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  push(value) {
    const node = new DNode(value);
    if (!this.tail) {
      this.head = this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.length++;
    return node;
  }

  unshift(value) {
    const node = new DNode(value);
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    this.length++;
    return node;
  }

  // O(1) — we already hold the node, so no searching
  remove(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = node.next = null;
    this.length--;
    return node.value;
  }

  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.value;
  }

  // Walk backwards from the tail — the thing a singly linked list can't do cheaply
  *reversed() {
    for (let n = this.tail; n; n = n.prev) yield n.value;
  }

  toArray() {
    return [...this];
  }
}
