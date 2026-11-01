// Usage: node --env-file=.env scripts/test-webhook.mjs <reference>
import crypto from "node:crypto";

const reference = process.argv[2] ?? "NOT-A-REAL-REFERENCE";
const secret =
  process.env.PAYMENT_GATEWAY === "simulated" ? process.env.SIMULATED_GATEWAY_SECRET : process.env.PAYSTACK_SECRET_KEY;
const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/paystack/webhook`;
const body = JSON.stringify({ event: "charge.success", data: { reference } });
const signature = crypto.createHmac("sha512", secret).update(body).digest("hex");

const send = (sig) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": sig }, body });

const good = await send(signature);
console.log(`Correct signature  → ${good.status} ${await good.text()}`);

const bad = await send(signature.replace(/^./, (c) => (c === "a" ? "b" : "a")));
console.log(`Tampered signature → ${bad.status} ${await bad.text()}`);
