import { SegmentTree } from "../SegmentTree";
import { topK } from "@/lib/topK";

describe("SegmentTree (range sums)", () => {
  const values = [5, 0, 3, 8, 2, 7, 1, 4, 6];
  const brute = (l, r) => values.slice(l, r + 1).reduce((a, b) => a + b, 0);

  it("answers every range exactly like a brute-force sum", () => {
    const tree = new SegmentTree(values);
    for (let l = 0; l < values.length; l++) {
      for (let r = l; r < values.length; r++) expect(tree.query(l, r)).toBe(brute(l, r));
    }
  });

  it("updates a single day in O(log n)", () => {
    const tree = new SegmentTree(values);
    tree.update(3, 100); // was 8
    expect(tree.query(0, 8)).toBe(brute(0, 8) - 8 + 100);
    expect(tree.query(3, 3)).toBe(100);
  });

  it("clips out-of-range bounds and handles empty ranges", () => {
    const tree = new SegmentTree(values);
    expect(tree.query(-5, 100)).toBe(brute(0, 8));
    expect(tree.query(5, 2)).toBe(0);
    expect(new SegmentTree([42]).query(0, 0)).toBe(42);
  });
});

describe("topK (MinHeap of size k)", () => {
  const counts = [
    { name: "Malaria", count: 40 },
    { name: "URTI", count: 12 },
    { name: "Hypertension", count: 25 },
    { name: "Typhoid", count: 9 },
    { name: "Diabetes", count: 18 },
  ];

  it("returns the k biggest, largest first", () => {
    expect(topK(counts, 3).map((c) => c.name)).toEqual(["Malaria", "Hypertension", "Diabetes"]);
  });

  it("returns everything (sorted) when k is larger than the list", () => {
    expect(topK(counts, 10)).toHaveLength(5);
    expect(topK([], 5)).toEqual([]);
  });

  it("ranks by any score", () => {
    expect(topK([{ q: 3 }, { q: 9 }, { q: 1 }], 1, (x) => x.q)).toEqual([{ q: 9 }]);
  });
});
