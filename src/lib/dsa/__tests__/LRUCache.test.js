import { LRUCache } from "../LRUCache";

describe("LRUCache", () => {
  it("evicts the least recently used (Module 4.6 example)", () => {
    const cache = new LRUCache(2);
    cache.set("USD-NGN", 1500);
    cache.set("GBP-NGN", 1900);
    cache.get("USD-NGN");
    cache.set("EUR-NGN", 1650);
    expect(cache.get("GBP-NGN")).toBeNull();
    expect(cache.get("USD-NGN")).toBe(1500);
  });

  it("lists keys from most to least recent", () => {
    const recent = new LRUCache(3);
    ["Ada", "Bayo", "Chi"].forEach((name) => recent.set(name, true));
    recent.get("Ada");
    expect(recent.keys()).toEqual(["Ada", "Chi", "Bayo"]);
  });

  it("updating an existing key moves it to the front without growing", () => {
    const c = new LRUCache(2);
    c.set("a", 1).set("b", 2).set("a", 10);
    expect(c.size()).toBe(2);
    expect(c.entries()).toEqual([["a", 10], ["b", 2]]);
  });
});
