// RFC 4180 CSV: quote fields containing commas, quotes or line breaks; double any quotes inside
const field = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(field).join(",")).join("\r\n");
}
