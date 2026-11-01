// End-of-day summary: per cashier, per method. Refunds are negative payments.
// payments: [{ receivedById, receivedByName, method, amountKobo }]
export function summarisePayments(payments) {
  const byCashier = new Map(); // O(1) lookup per payment → O(n) overall

  for (const p of payments) {
    if (!byCashier.has(p.receivedById)) {
      byCashier.set(p.receivedById, { id: p.receivedById, name: p.receivedByName, methods: {}, receivedKobo: 0, refundedKobo: 0, count: 0 });
    }
    const c = byCashier.get(p.receivedById);
    const m = (c.methods[p.method] ??= { receivedKobo: 0, refundedKobo: 0, count: 0 });

    if (p.amountKobo >= 0) {
      m.receivedKobo += p.amountKobo;
      c.receivedKobo += p.amountKobo;
    } else {
      m.refundedKobo -= p.amountKobo;
      c.refundedKobo -= p.amountKobo;
    }
    m.count++;
    c.count++;
  }

  const cashiers = [...byCashier.values()].map((c) => ({
    ...c,
    netKobo: c.receivedKobo - c.refundedKobo,
    // Only CASH ends up in the drawer — POS, transfer and online go straight to the bank
    cashInDrawerKobo: (c.methods.CASH?.receivedKobo ?? 0) - (c.methods.CASH?.refundedKobo ?? 0),
  }));

  const totalReceivedKobo = cashiers.reduce((s, c) => s + c.receivedKobo, 0);
  const totalRefundedKobo = cashiers.reduce((s, c) => s + c.refundedKobo, 0);
  return { cashiers, totalReceivedKobo, totalRefundedKobo, netKobo: totalReceivedKobo - totalRefundedKobo };
}
