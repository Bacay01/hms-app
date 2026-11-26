import { requirePermission } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { loadReport, parseRange } from "@/lib/reports";
import { localDate } from "@/lib/time";

const naira = (kobo) => (kobo / 100).toFixed(2);

export async function GET(request) {
  await requirePermission("reports.read");
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "daily";
  const today = localDate();
  const range = parseRange(params.get("from") ?? "", params.get("to") ?? "", today);
  const r = await loadReport({ ...range, today });

  const sheets = {
    daily: [["Date", "Cash collected (NGN)", "HMO billed (NGN)"], r.daily.map((d) => [d.date, naira(d.cashKobo), naira(d.hmoKobo)])],
    monthly: [["Month", "Cash collected (NGN)", "HMO billed (NGN)"], r.months.map((m) => [m.month, naira(m.cashKobo), naira(m.hmoKobo)])],
    departments: [["Department", "Visits", "Unique patients"], r.departments.map((d) => [d.name, d.visits, d.patients])],
    diagnoses: [["Rank", "Diagnosis", "ICD-10", "Count"], r.topDiagnoses.map((d, i) => [i + 1, d.name, d.code ?? "", d.count])],
    drugs: [["Rank", "Drug", "Quantity dispensed", "Unit"], r.drugs.top.map((d, i) => [i + 1, d.name, d.quantity, d.unit])],
  };
  const sheet = sheets[type];
  if (!sheet) return new Response("Unknown report type", { status: 400 });

  return new Response(toCsv(sheet[0], sheet[1]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${type}-${range.from}-to-${range.to}.csv"`,
    },
  });
}
