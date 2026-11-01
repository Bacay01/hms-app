// ---------- Pay before service: FIFO allocation ----------
// Payments cover bill items in the order they were ordered (consultation first).
// items: ACTIVE bill items sorted by createdAt → Map sourceId → "PAID" | "PART" | "UNPAID"
export function allocatePayments(items, paidKobo) {
  const status = new Map();
  // Discounts are negative lines: they count as money available to cover the other items
  let remaining = paidKobo + items.filter((i) => i.amountKobo < 0).reduce((sum, i) => sum - i.amountKobo, 0);
  for (const item of items) {
    if (item.amountKobo < 0) continue; // the discount line itself
    if (item.priceMissing) {
      status.set(item.sourceId, "UNPAID"); // can't be paid until it has a price
    } else if (remaining >= item.amountKobo) {
      status.set(item.sourceId, "PAID");
      remaining -= item.amountKobo;
    } else if (remaining > 0) {
      status.set(item.sourceId, "PART");
      remaining = 0;
    } else {
      status.set(item.sourceId, "UNPAID");
    }
  }
  return status;
}

// ---------- Amount in words (recursion) ----------
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = [[1_000_000_000, "billion"], [1_000_000, "million"], [1_000, "thousand"]];

// 8860 → "eight thousand, eight hundred and sixty". Each call handles one chunk and recurses on the rest.
export function numberToWords(n) {
  if (n === 0) return "zero";
  for (const [value, name] of SCALES) {
    if (n >= value) {
      const rest = n % value;
      const tail = rest === 0 ? "" : (rest < 100 ? " and " : ", ") + numberToWords(rest);
      return `${numberToWords(Math.floor(n / value))} ${name}${tail}`;
    }
  }
  if (n >= 100) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${numberToWords(rest)}` : ""}`;
  }
  if (n >= 20) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  return ONES[n];
}

export function nairaInWords(kobo) {
  const naira = Math.floor(kobo / 100);
  const k = kobo % 100;
  const text = `${numberToWords(naira)} naira${k ? `, ${numberToWords(k)} kobo` : ""} only`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
