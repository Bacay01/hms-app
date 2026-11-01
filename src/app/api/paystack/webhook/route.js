import { verifySignature } from "@/lib/paystackChecks";
import { gatewaySecret, settleOnlinePayment } from "@/lib/paystack";

// The gateway's servers call this. Read the RAW body — the signature is over the exact bytes sent.
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifySignature(raw, signature, gatewaySecret())) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await settleOnlinePayment(event.data.reference);
    } catch (e) {
      console.error("Payment webhook: could not settle", e);
      return new Response("Try again", { status: 500 }); // gateways retry non-200 responses
    }
  }
  return new Response("OK", { status: 200 });
}
