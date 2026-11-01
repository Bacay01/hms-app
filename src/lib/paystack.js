import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { checkCharge } from "@/lib/paystackChecks";
import { nextReceiptNumber } from "@/lib/receipts";

// PAYMENT_GATEWAY=simulated → a local stand-in for Paystack's servers (testing only).
// Anything else → the real Paystack API. Everything below the two gateway calls is the same either way.
const SIMULATED = process.env.PAYMENT_GATEWAY === "simulated";
const API = "https://api.paystack.co";

export const gatewayName = SIMULATED ? "simulated gateway" : "Paystack";

export function gatewaySecret() {
  return SIMULATED ? process.env.SIMULATED_GATEWAY_SECRET : process.env.PAYSTACK_SECRET_KEY;
}

export function gatewayConfigured() {
  return Boolean(gatewaySecret() && process.env.APP_URL);
}

async function call(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${gatewaySecret()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) throw new Error(json?.message ?? `Paystack error ${res.status}`);
  return json.data;
}

// ---------- the two calls to "the outside world" ----------

export async function paystackInitialize({ email, amountKobo, reference, callbackUrl, metadata }) {
  if (SIMULATED) {
    await prisma.simulatedGatewayCharge.create({ data: { reference, email, amountKobo } });
    return { authorization_url: `${process.env.APP_URL}/pay/simulated/${encodeURIComponent(reference)}`, reference };
  }
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({ email, amount: amountKobo, reference, currency: "NGN", callback_url: callbackUrl, metadata }),
  });
}

export async function paystackVerify(reference) {
  if (SIMULATED) {
    const charge = await prisma.simulatedGatewayCharge.findUnique({ where: { reference } });
    if (!charge) throw new Error("Transaction reference not found");
    return {
      status: charge.status,
      reference: charge.reference,
      currency: "NGN",
      amount: charge.chargedKobo ?? charge.amountKobo,
      paid_at: charge.paidAt?.toISOString() ?? null,
      channel: "simulated",
    };
  }
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// ---------- settling: identical for real and simulated ----------

// Called by the webhook, the callback page and "Check status". Safe to call any number of times.
export async function settleOnlinePayment(reference) {
  const intent = await prisma.onlinePayment.findUnique({
    where: { reference },
    include: { bill: { select: { encounterId: true } } },
  });
  if (!intent) return { ok: false, reason: "unknown_reference" };
  if (intent.status === "SUCCESS") return { ok: true, already: true, intent, paymentId: intent.paymentId };

  // Never trust the caller — ask the gateway directly what happened
  const data = await paystackVerify(reference);
  const check = checkCharge(intent, data);
  if (!check.ok) {
    if (data?.status === "failed" || data?.status === "abandoned") {
      await prisma.onlinePayment.update({ where: { id: intent.id }, data: { status: "FAILED" } });
    }
    if (check.reason === "amount_mismatch" || check.reason === "currency_mismatch") {
      await audit({
        action: "payment.paystack_mismatch",
        entity: "Bill",
        entityId: intent.billId,
        details: { reference, reason: check.reason, expectedKobo: intent.amountKobo, gotKobo: Number(data?.amount) },
      });
    }
    return { ok: false, reason: check.reason, intent };
  }

  const payment = await prisma.$transaction(async (tx) => {
    // The webhook and the callback often race — lock the link; the first one in records the payment
    await tx.$queryRaw`SELECT id FROM "OnlinePayment" WHERE id = ${intent.id} FOR UPDATE`;
    const fresh = await tx.onlinePayment.findUnique({ where: { id: intent.id } });
    if (fresh.status === "SUCCESS") return null;

    await tx.$queryRaw`SELECT id FROM "Bill" WHERE id = ${intent.billId} FOR UPDATE`;
    const bill = await tx.bill.findUnique({ where: { id: intent.billId }, select: { totalKobo: true, paidKobo: true } });

    // Money already taken is never refused — an overpayment shows as a credit (refund in 5D)
    const created = await tx.payment.create({
      data: {
        billId: intent.billId,
        receiptNumber: await nextReceiptNumber(tx),
        amountKobo: intent.amountKobo,
        method: "PAYSTACK",
        reference,
        billTotalKobo: bill.totalKobo,
        balanceAfterKobo: bill.totalKobo - bill.paidKobo - intent.amountKobo,
        receivedById: intent.createdById,
      },
    });
    await tx.bill.update({ where: { id: intent.billId }, data: { paidKobo: { increment: intent.amountKobo } } });
    await tx.onlinePayment.update({
      where: { id: intent.id },
      data: { status: "SUCCESS", paymentId: created.id, paidAt: data.paid_at ? new Date(data.paid_at) : new Date(), channel: data.channel ?? null },
    });
    return created;
  });

  if (payment) {
    await audit({
      action: "payment.paystack",
      entity: "Bill",
      entityId: intent.billId,
      details: { paymentId: payment.id, receiptNumber: payment.receiptNumber, reference, amountKobo: intent.amountKobo, gateway: gatewayName },
    });
    revalidatePath(`/billing/${intent.billId}`);
    revalidatePath("/billing");
    revalidatePath(`/consultations/${intent.bill.encounterId}`);
  }

  const fresh = await prisma.onlinePayment.findUnique({ where: { id: intent.id } });
  return { ok: true, intent: fresh, paymentId: fresh.paymentId };
}
