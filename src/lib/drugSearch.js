import { Trie } from "@/lib/dsa/Trie";

const words = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Every word of each drug's name, ingredients and brand names → one Trie
export function buildDrugIndex(drugs) {
  const trie = new Trie();
  const byId = new Map();
  for (const d of drugs) {
    byId.set(d.id, d);
    for (const text of [d.name, ...d.generic, ...d.aka]) {
      for (const w of words(text)) trie.insert(w, d.id);
    }
  }
  return { trie, byId };
}

export function searchDrugs(index, query, limit = 8) {
  const terms = words(query);
  if (terms.length === 0) return [];

  let matches = null;
  for (const term of terms) {
    const ids = index.trie.collect(term);
    matches = matches === null ? ids : new Set([...matches].filter((id) => ids.has(id)));
    if (matches.size === 0) return [];
  }

  const q = query.trim().toLowerCase();
  return [...matches]
    .map((id) => index.byId.get(id))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
