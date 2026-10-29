import { Queue } from "../Queue";

describe("Queue (FIFO)", () => {
  it("serves in the order people joined", () => {
    const q = new Queue();
    [1, 2, 3, 4, 5].forEach((v) => q.enqueue(v));
    q.dequeue();
    q.dequeue();
    expect(q.toArray()).toEqual([3, 4, 5]);
  });

  it("peek shows the front without removing it", () => {
    const q = new Queue(["Ada", "Bayo"]);
    expect(q.peek()).toBe("Ada");
    expect(q.size()).toBe(2);
  });

  it("returns null when empty and resets the rear", () => {
    const q = new Queue([1]);
    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBeNull();
    expect(q.isEmpty()).toBe(true);
    q.enqueue(9);
    expect(q.toArray()).toEqual([9]);
  });
});
