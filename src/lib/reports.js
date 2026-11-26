import { prisma } from "@/lib/prisma";
import { SegmentTree } from "@/lib/dsa/SegmentTree";
import { DRUG_BY_ID } from "@/lib/drugs";
import { nextMonth } from "@/lib/hmo";
import { addDays, daysUntil } from "@/lib/stock";
import { topK } from "@/lib/topK";
import { dayRange, localDate } from "@/lib/time";

export const WINDOW_DAYS = 366; // one year of daily totals, ending today

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRange(fromParam, toParam, today) {
  const windowStart = addDays(today, -(WINDOW_DAYS - 1));
  let from = DATE_RE.test(fromParam ?? "") ? fromParam : `${today.slice(0, 7)}-01`;
  let to = DATE_RE.test(toParam ?? "") ? toParam : today;
  if (from > to) [from, to] = [to, from];
  if (from < windowStart) from = windowStart;
  if (to > today) to = today;
  return { from, to, windowStart };
}

export async function loadReport({ from, to, today, windowStart }) {
  const idx = (dateStr) => daysUntil(dateStr, windowStart); // day number within the window
  const windowFrom = dayRange(windowStart).start;
  const rangeFrom = dayRange(from).start;
  const rangeTo = dayRange(to).end;

  const [payments, hmoBills, encounters, diagnoses, dispensed, batches] = await Promise.all([
    prisma.payment.findMany({ where: { createdAt: { gte: windowFrom } }, select: { amountKobo: true, createdAt: true } }),
    prisma.bill.findMany({ where: { hmoKobo: { gt: 0 }, encounter: { startedAt: { gte: windowFrom } } }, select: { hmoKobo: true, encounter: { select: { startedAt: true } } } }),
    prisma.encounter.findMany({
      where: { startedAt: { gte: rangeFrom, lt: rangeTo }, status: { notIn: ["CANCELLED"] } },
      select: { patientId: true, doctor: { select: { department: { select: { name: true } } } } },
    }),
    prisma.diagnosis.findMany({ where: { removedAt: null, createdAt: { gte: rangeFrom, lt: rangeTo } }, select: { name: true, code: true } }),
    prisma.stockMovement.findMany({ where: { type: "DISPENSED", createdAt: { gte: rangeFrom, lt: rangeTo } }, select: { drugId: true, quantity: true } }),
    prisma.stockBatch.findMany({ where: { quantityOnHand: { gt: 0 } }, select: { quantityOnHand: true, costKobo: true, expiryDate: true } }),
  ]);

  // ---- Daily arrays → segment trees (one load, then every range question is O(log n)) ----
  const cash = new Array(WINDOW_DAYS).fill(0);
  for (const p of payments) {
    const i = idx(localDate(p.createdAt));
    if (i >= 0 && i < WINDOW_DAYS) cash[i] += p.amountKobo; // refunds are negative, so this is net
  }
  const hmo = new Array(WINDOW_DAYS).fill(0);
  for (const b of hmoBills) {
    const i = idx(localDate(b.encounter.startedAt));
    if (i >= 0 && i < WINDOW_DAYS) hmo[i] += b.hmoKobo;
  }
  const cashTree = new SegmentTree(cash);
  const hmoTree = new SegmentTree(hmo);
  const sum = (tree, a, b) => tree.query(idx(a), idx(b));

  const monthStart = `${today.slice(0, 7)}-01`;
  const kpis = {
    today: sum(cashTree, today, today),
    last7: sum(cashTree, addDays(today, -6), today),
    thisMonth: sum(cashTree, monthStart, today),
    range: sum(cashTree, from, to),
    hmoRange: sum(hmoTree, from, to),
  };

  // 12 calendar months, newest first — 24 range queries
  const months = [];
  let m = today.slice(0, 7);
  for (let k = 0; k < 12; k++) {
    const start = `${m}-01`;
    const end = addDays(`${nextMonth(m)}-01`, -1);
    months.push({ month: m, cashKobo: sum(cashTree, start, end), hmoKobo: sum(hmoTree, start, end) });
    const [y, mm] = m.split("-").map(Number);
    m = mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, "0")}`;
  }

  const daily = [];
  for (let d = from; d <= to; d = addDays(d, 1)) daily.push({ date: d, cashKobo: cash[idx(d)], hmoKobo: hmo[idx(d)] });

  // ---- Visits by department (Set for unique patients) ----
  const byDept = new Map();
  for (const e of encounters) {
    const name = e.doctor?.department?.name ?? "No department";
    if (!byDept.has(name)) byDept.set(name, { name, visits: 0, patients: new Set() });
    const d = byDept.get(name);
    d.visits++;
    d.patients.add(e.patientId);
  }
  const departments = [...byDept.values()]
    .map((d) => ({ name: d.name, visits: d.visits, patients: d.patients.size }))
    .sort((a, b) => b.visits - a.visits);

  // ---- Top 10 diagnoses (MinHeap top-k) ----
  const dxCounts = new Map();
  for (const d of diagnoses) {
    const key = d.code ?? d.name.toLowerCase();
    if (!dxCounts.has(key)) dxCounts.set(key, { name: d.name, code: d.code, count: 0 });
    dxCounts.get(key).count++;
  }
  const topDiagnoses = topK([...dxCounts.values()], 10);

  // ---- Drugs: top 10 by quantity dispensed + stock value at cost ----
  const used = new Map();
  for (const mv of dispensed) used.set(mv.drugId, (used.get(mv.drugId) ?? 0) - mv.quantity); // dispensed rows are negative
  const topDrugs = topK(
    [...used.entries()].map(([drugId, quantity]) => ({ drugId, name: DRUG_BY_ID.get(drugId)?.name ?? drugId, unit: DRUG_BY_ID.get(drugId)?.unit ?? "unit", quantity })),
    10,
    (x) => x.quantity
  );
  let stockValueKobo = 0;
  let uncosted = 0;
  for (const b of batches) {
    if (b.expiryDate < today) continue; // expired stock has no value
    if (b.costKobo == null) uncosted++;
    else stockValueKobo += b.quantityOnHand * b.costKobo;
  }

  return { kpis, months, daily, departments, topDiagnoses, drugs: { top: topDrugs, stockValueKobo, uncosted } };
}
