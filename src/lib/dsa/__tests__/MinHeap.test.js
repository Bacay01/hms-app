import { MinHeap } from "../MinHeap";

describe("MinHeap", () => {
  it("always pops the smallest number", () => {
    const h = new MinHeap();
    [5, 3, 8, 1, 9, 2].forEach((n) => h.push(n));
    const out = [];
    while (!h.isEmpty()) out.push(h.pop());
    expect(out).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it("supports a custom comparator", () => {
    const h = new MinHeap((a, b) => a.priority - b.priority);
    h.push({ name: "Chidi", priority: 3 });
    h.push({ name: "Amaka", priority: 1 });
    h.push({ name: "Femi", priority: 2 });
    expect(h.pop().name).toBe("Amaka");
    expect(h.pop().name).toBe("Femi");
  });

  it("toSortedArray does not empty the heap", () => {
    const h = new MinHeap();
    [4, 1, 3].forEach((n) => h.push(n));
    expect(h.toSortedArray()).toEqual([1, 3, 4]);
    expect(h.size()).toBe(3);
  });

  it("returns null when empty", () => {
    const h = new MinHeap();
    expect(h.pop()).toBeNull();
    expect(h.peek()).toBeNull();
  });
});
