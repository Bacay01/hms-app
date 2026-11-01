// All money is KOBO (whole numbers). ₦5,000.00 = 500000.
// Floats can't represent money exactly (0.1 + 0.2 !== 0.3), so we never use them for amounts.

export function formatNaira(kobo) {
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(kobo);
  const naira = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₦${naira}.${String(abs % 100).padStart(2, "0")}`;
}

// "5,000" → 500000 · "1500.5" → 150050 · invalid → null. Parsed as text, never via floats.
export function nairaToKobo(input) {
  const s = String(input ?? "").trim().replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
