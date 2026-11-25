// ---------- Reference range lookup: binary search over age bands ----------
// Bands for one sex, sorted by `from`. We want the LAST band whose `from` <= age — O(log n).
function bandFor(bands, age) {
  let lo = 0;
  let hi = bands.length - 1;
  let found = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bands[mid].from <= age) {
      found = bands[mid]; // a candidate — look right for a later one
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

const byFrom = (a, b) => a.from - b.from;

// A band written for the patient's sex always wins; "ANY" bands are only the fallback
export function findRange(ranges, sex, age) {
  const specific = bandFor(ranges.filter((r) => r.sex === sex).sort(byFrom), age);
  const general = bandFor(ranges.filter((r) => r.sex === "ANY").sort(byFrom), age);
  return specific ?? general;
}

export function rangeText(range) {
  if (!range) return null;
  const { low, high } = range;
  if (low != null && high != null) return `${low}–${high}`;
  if (high != null) return `< ${high}`;
  if (low != null) return `> ${low}`;
  return null;
}

// ---------- Validation ----------
export function parseResult(analyte, raw) {
  const text = String(raw ?? "").trim();
  if (analyte.type === "text") return { value: text.slice(0, 500) };
  if (!text) return { error: `Enter a value for ${analyte.name}.` };

  if (analyte.type === "choice") {
    if (!analyte.options.includes(text)) return { error: `Choose a valid option for ${analyte.name}.` };
    return { value: text };
  }

  const n = Number(text);
  if (!Number.isFinite(n) || n < analyte.min || n > analyte.max) {
    return { error: `${analyte.name} must be between ${analyte.min} and ${analyte.max} ${analyte.unit} — check for a typo.` };
  }
  return { value: text, number: n };
}

// ---------- Flagging ----------
export function evaluateResult(analyte, value, { sex, age }) {
  if (analyte.type === "number") {
    const n = Number(value);
    const range = findRange(analyte.ranges ?? [], sex, age);
    const c = analyte.critical ?? {};
    let flag = null;
    if (c.low != null && n < c.low) flag = "CRITICAL_LOW";
    else if (c.high != null && n > c.high) flag = "CRITICAL_HIGH";
    else if (range?.low != null && n < range.low) flag = "LOW";
    else if (range?.high != null && n > range.high) flag = "HIGH";
    return { numericValue: n, flag, refLow: range?.low ?? null, refHigh: range?.high ?? null, refText: rangeText(range) };
  }
  if (analyte.type === "choice") {
    const normal = analyte.options.find((o) => !(analyte.abnormal ?? []).includes(o));
    return {
      numericValue: null,
      flag: (analyte.abnormal ?? []).includes(value) ? "ABNORMAL" : null,
      refLow: null,
      refHigh: null,
      refText: analyte.abnormal?.length ? normal : null,
    };
  }
  return { numericValue: null, flag: null, refLow: null, refHigh: null, refText: null };
}

export const isCritical = (flag) => flag === "CRITICAL_LOW" || flag === "CRITICAL_HIGH";

export const FLAG_LABELS = {
  LOW: "Low",
  HIGH: "High",
  CRITICAL_LOW: "Critical low",
  CRITICAL_HIGH: "Critical high",
  ABNORMAL: "Abnormal",
};
