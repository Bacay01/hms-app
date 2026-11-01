import { Trie } from "../Trie";

describe("Trie", () => {
  const t = new Trie();
  t.insert("malaria", "B54").insert("malnutrition", "E46").insert("measles", "B05.9");

  it("knows whole words but not bare prefixes", () => {
    expect(t.has("malaria")).toBe(true);
    expect(t.has("mala")).toBe(false);
  });

  it("collects everything under a prefix", () => {
    expect([...t.collect("mal")].sort()).toEqual(["B54", "E46"]);
    expect([...t.collect("m")].sort()).toEqual(["B05.9", "B54", "E46"]);
  });

  it("returns an empty set for an unknown prefix", () => {
    expect(t.collect("xyz").size).toBe(0);
  });

  it("lets several items share one word", () => {
    const fevers = new Trie().insert("fever", "A01.0").insert("fever", "A96.2");
    expect([...fevers.collect("fev")].sort()).toEqual(["A01.0", "A96.2"]);
  });
});
