import { findOverlap, lowerBound, nextFreeSlot } from "../intervals";

const MIN = 60 * 1000;
const at = (h, m = 0) => (h * 60 + m) * MIN; // minutes since midnight, in ms
const SLOT = 15 * MIN;

describe("lowerBound (binary search)", () => {
  it("finds the insertion index", () => {
    const a = [10, 20, 30, 40];
    expect(lowerBound(a, 5)).toBe(0);
    expect(lowerBound(a, 20)).toBe(1);
    expect(lowerBound(a, 25)).toBe(2);
    expect(lowerBound(a, 99)).toBe(4);
  });
});

describe("findOverlap", () => {
  const day = [at(9), at(9, 30), at(10)];

  it("detects a clash with the slot after", () => {
    expect(findOverlap(day, at(9, 20), SLOT)).toBe(at(9, 30));
  });

  it("detects a clash with the slot before", () => {
    expect(findOverlap(day, at(9, 10), SLOT)).toBe(at(9));
  });

  it("allows back-to-back slots", () => {
    expect(findOverlap(day, at(9, 15), SLOT)).toBeNull();
  });

  it("works on an empty day", () => {
    expect(findOverlap([], at(9), SLOT)).toBeNull();
  });
});

describe("nextFreeSlot", () => {
  it("hops over a run of booked slots", () => {
    const busy = [at(9), at(9, 15), at(9, 30)];
    expect(nextFreeSlot(busy, at(9), SLOT, at(15, 45))).toBe(at(9, 45));
  });

  it("returns null when the day is full", () => {
    const busy = [at(15, 30), at(15, 45)];
    expect(nextFreeSlot(busy, at(15, 30), SLOT, at(15, 45))).toBeNull();
  });
});
