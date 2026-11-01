"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncEncounterBill } from "@/lib/billing";
import { formatNaira } from "@/lib/money";
import { gatewayConfigured, paystackInitialize, settleOnlinePayment } from "@/lib/paystack";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createPaystackLink(billId, prevState, formData) {
  const session = await requirePermission("billing.payments");
  if (!gatewayConfigured()) {
    return { error: "No payment gateway set up: see PAYMENT_GATEWAY / PAYSTACK_SECRET_KEY and APP_URL in .env." };
  }

  const found = await prisma.bill.findUnique({
    where: { id: billId },
    select: { encounterId: true, patient: { select: { hospitalNumber: true } } },
  });
  if (!found) return { error: "Bill not found." };
  await syncEncounterBill(found.encounterId);

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    select: { totalKobo: true, paidKobo: true, items: { where: { status: "ACTIVE", priceMissing: true }, select: { id: true } } },
  });
  if (bill.items.length) return { error: "Some items have no price yet." };
  const amountKobo = bill.totalKobo - bill.paidKobo;
  if (amountKobo <= 0) return { error: "Nothing to pay — the bill is fully paid." };

  // The gateway needs an email for its receipt. Without one we use a reserved, non-delivering address.
  const typed = String(formData.get("email") || "").trim().toLowerCase();
  if (typed && !EMAIL_RE.test(typed)) return { error: "That email doesn't look right." };
  const hn = found.patient.hospitalNumber;
  const email = typed || `patient+${hn.toLowerCase()}@example.com`;
  const reference = `${hn}-${Date.now().toString(36)}`.toUpperCase();

  let data;
  try {
    data = await paystackInitialize({
      email,
      amountKobo,
      reference,
      callbackUrl: `${process.env.APP_URL}/pay/callback`,
      metadata: { billId, hospitalNumber: hn },
    });
  } catch (e) {
    return { error: `The payment gateway said: ${e.message}` };
  }

  await prisma.onlinePayment.create({
    data: { billId, reference, amountKobo, email, authorizationUrl: data.authorization_url, createdById: session.userId },
  });
  await audit({ action: "payment.link_created", entity: "Bill", entityId: billId, userId: session.userId, details: { reference, amountKobo } });

  revalidatePath(`/billing/${billId}`);
  return { link: data.authorization_url, amountText: formatNaira(amountKobo), savedAt: reference };
}

// Ask the gateway directly — for when no webhook arrives (e.g. on localhost)
export async function checkPaystackStatus(prevState, formData) {
  await requirePermission("billing.payments");
  const reference = String(formData.get("reference") || "");
  try {
    const result = await settleOnlinePayment(reference);
    if (result.ok) return { message: result.already ? "Already recorded." : "Paid — receipt created." };
    return { message: `Not paid yet (${result.reason.replace(/_/g, " ")}).` };
  } catch (e) {
    return { message: `Couldn't reach the gateway: ${e.message}` };
  }
}
