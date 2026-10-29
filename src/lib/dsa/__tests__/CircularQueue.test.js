import { CircularQueue } from "../CircularQueue";

describe("CircularQueue", () => {
  it("holds exactly `capacity` items", () => {
    const cq = new CircularQueue(5);
    [10, 20, 30, 40, 50].forEach((v) => cq.enqueue(v));
    expect(cq.isFull()).toBe(true);
    expect(cq.enqueue(60)).toBe(false);
  });

  it("wraps around after dequeues (Module 5.4)", () => {
    const cq = new CircularQueue(5);
    [10, 20, 30, 40, 50].forEach((v) => cq.enqueue(v));
    cq.dequeue();
    cq.dequeue();
    cq.enqueue(60);
    cq.enqueue(70);
    expect(cq.toArray()).toEqual([30, 40, 50, 60, 70]);
  });

  it("overwrite mode keeps only the latest N (ring buffer)", () => {
    const lastCalled = new CircularQueue(3, { overwrite: true });
    [1, 2, 3, 4, 5].forEach((n) => lastCalled.enqueue(n));
    expect(lastCalled.toArray()).toEqual([3, 4, 5]);
    expect(lastCalled.peekLast()).toBe(5);
  });

  it("rejects an invalid capacity", () => {
    expect(() => new CircularQueue(0)).toThrow();
  });
});
