import { Trie } from "@/lib/dsa/Trie";

const words = (text) => String(text).toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);

// Every word of every name, code and everyday name goes into one Trie
export function buildDiagnosisIndex(list) {
  const trie = new Trie();
  const byCode = new Map();
  for (const d of list) {
    byCode.set(d.code, d);
    trie.insert(d.code.toLowerCase(), d.code);
    for (const w of words(d.name)) trie.insert(w, d.code);
    for (const alias of d.aka) for (const w of words(alias)) trie.insert(w, d.code);
  }
  return { trie, byCode };
}

// Every query word must prefix-match some word of the diagnosis (Set intersection).
// Names that START with the query rank first, then codes, then everything else.
export function searchDiagnoses(index, query, limit = 8) {
  const terms = words(query);
  if (terms.length === 0) return [];

  let matches = null;
  for (const term of terms) {
    const ids = index.trie.collect(term);
    matches = matches === null ? ids : new Set([...matches].filter((id) => ids.has(id)));
    if (matches.size === 0) return [];
  }

  const q = query.trim().toLowerCase();
  const rank = (d) => (d.name.toLowerCase().startsWith(q) ? 0 : d.code.toLowerCase().startsWith(q) ? 1 : 2);

  return [...matches]
    .map((code) => index.byCode.get(code))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
