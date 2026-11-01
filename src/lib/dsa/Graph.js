// Module 7 — Graph stored as an ADJACENCY LIST: Map<node, Map<neighbour, edgeData>>.
// Undirected: an edge a–b is stored on both a and b.
// getEdge / hasEdge: O(1) · neighbours(a): O(degree of a) · memory: O(V + E)
export class Graph {
  constructor() {
    this.adj = new Map();
    this.edgeCount = 0;
  }

  addNode(node) {
    if (!this.adj.has(node)) this.adj.set(node, new Map());
    return this;
  }

  addEdge(a, b, data = {}) {
    if (a === b) return this; // no self-loops
    this.addNode(a).addNode(b);
    if (!this.adj.get(a).has(b)) this.edgeCount++;
    this.adj.get(a).set(b, data);
    this.adj.get(b).set(a, data);
    return this;
  }

  getEdge(a, b) {
    return this.adj.get(a)?.get(b) ?? null;
  }

  hasEdge(a, b) {
    return this.getEdge(a, b) !== null;
  }

  neighbours(node) {
    return [...(this.adj.get(node)?.keys() ?? [])];
  }

  get nodeCount() {
    return this.adj.size;
  }
}
