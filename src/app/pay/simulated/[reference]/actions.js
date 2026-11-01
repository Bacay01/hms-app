"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Plays the gateway's part: record the outcome, send a SIGNED webhook, redirect back — like Paystack does
export async function simulateCharge(formData) {
  if (process.env.PAYMENT_GATEWAY !== "simulated") throw new Error("The simulated gateway is switched off.");

  const reference = String(formData.get("reference") || "");
  const outcome = String(formData.get("outcome") || "");
  const skipWebhook = formData.get("skipWebhook") === "on";
  const back = `/pay/callback?reference=${encodeURIComponent(reference)}`;

  const charge = await prisma.simulatedGatewayCharge.findUnique({ where: { reference } });
  if (!charge || charge.status !== "pending") redirect(back);

  const success = outcome === "success" || outcome === "tampered";
  const chargedKobo = outcome === "tampered" ? charge.amountKobo - 100 : charge.amountKobo; // ₦1 less

  await prisma.simulatedGatewayCharge.update({
    where: { reference },
    data: { status: success ? "success" : "failed", chargedKobo, paidAt: success ? new Date() : null },
  });

  if (!skipWebhook) {
    const body = JSON.stringify({
      event: success ? "charge.success" : "charge.failed",
      data: { reference, amount: chargedKobo, currency: "NGN", status: success ? "success" : "failed" },
    });
    const signature = crypto.createHmac("sha512", process.env.SIMULATED_GATEWAY_SECRET).update(body).digest("hex");
    try {
      const res = await fetch(`${process.env.APP_URL}/api/paystack/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-paystack-signature": signature },
        body,
      });
      console.log(`Simulated gateway → webhook answered ${res.status}`);
    } catch (e) {
      console.error("Simulated gateway: webhook could not be sent", e);
    }
  }

  redirect(back);
}
