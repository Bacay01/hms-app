// Module 6.8 — Trie (prefix tree). Each node is one character; a path from the root spells a word.
// insert / has: O(L) where L = word length — independent of how many words are stored.
// collect(prefix): walk L nodes, then DFS (with an explicit Stack) under that node.
// Each word stores a Set of ids, so many items can share a word ("fever" → typhoid, lassa…).

class TrieNode {
  constructor() {
    this.children = new Map(); // character → TrieNode
    this.ids = new Set();      // ids of items containing a word that ends here
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
    this.words = 0;
  }

  insert(word, id) {                     // O(L)
    let cur = this.root;
    for (const ch of word) {
      if (!cur.children.has(ch)) cur.children.set(ch, new TrieNode());
      cur = cur.children.get(ch);
    }
    if (cur.ids.size === 0) this.words++;
    cur.ids.add(id);
    return this;
  }

  _walk(prefix) {                        // O(L)
    let cur = this.root;
    for (const ch of prefix) {
      cur = cur.children.get(ch);
      if (!cur) return null;
    }
    return cur;
  }

  has(word) {
    const node = this._walk(word);
    return Boolean(node && node.ids.size > 0);
  }

  // Every id stored under this prefix — DFS using an explicit Stack (Module 3)
  collect(prefix) {
    const start = this._walk(prefix);
    const out = new Set();
    if (!start) return out;
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      for (const id of node.ids) out.add(id);
      for (const child of node.children.values()) stack.push(child);
    }
    return out;
  }
}
