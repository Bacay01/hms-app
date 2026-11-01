import crypto from "node:crypto";

// The gateway signs every webhook: HMAC-SHA512 of the RAW body, keyed with the secret.
// timingSafeEqual compares in constant time, so the signature can't be guessed byte by byte.
export function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(crypto.createHmac("sha512", secret).update(rawBody).digest("hex"), "hex");
  let given;
  try {
    given = Buffer.from(String(signature), "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// What the gateway's verify API says must match what WE asked for — exactly
export function checkCharge(intent, data) {
  if (!data) return { ok: false, reason: "no_data" };
  if (data.status !== "success") return { ok: false, reason: `status_${data.status}` };
  if (data.reference !== intent.reference) return { ok: false, reason: "reference_mismatch" };
  if (data.currency !== "NGN") return { ok: false, reason: "currency_mismatch" };
  if (Number(data.amount) !== intent.amountKobo) return { ok: false, reason: "amount_mismatch" };
  return { ok: true };
}
