import { Graph } from "../Graph";

describe("Graph (adjacency list)", () => {
  it("stores undirected edges both ways", () => {
    const g = new Graph().addEdge("warfarin", "ibuprofen", { severity: "major" });
    expect(g.getEdge("warfarin", "ibuprofen")).toEqual({ severity: "major" });
    expect(g.getEdge("ibuprofen", "warfarin")).toEqual({ severity: "major" });
    expect(g.hasEdge("warfarin", "paracetamol")).toBe(false);
  });

  it("ignores self-loops and never double-counts an edge", () => {
    const g = new Graph().addEdge("a", "a").addEdge("a", "b").addEdge("b", "a");
    expect(g.edgeCount).toBe(1);
    expect(g.nodeCount).toBe(2);
  });

  it("lists a node's neighbours", () => {
    const g = new Graph().addEdge("warfarin", "ibuprofen").addEdge("warfarin", "metronidazole");
    expect(g.neighbours("warfarin").sort()).toEqual(["ibuprofen", "metronidazole"]);
    expect(g.neighbours("unknown")).toEqual([]);
  });
});
