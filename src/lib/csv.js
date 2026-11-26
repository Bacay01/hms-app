// RFC 4180 CSV: quote fields containing commas, quotes or line breaks; double any quotes inside
const field = (v) => {
  let s = v === null || v === undefined ? "" : String(v);
  // Formula injection: text starting with = + - @ is shown as text (plain numbers like -500 are left alone)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(field).join(",")).join("\r\n");
}
