import crypto from "node:crypto";
import { checkCharge, verifySignature } from "@/lib/paystackChecks";

const secret = "sk_test_dummy";
const body = JSON.stringify({ event: "charge.success", data: { reference: "ILH-1" } });
const sign = (raw) => crypto.createHmac("sha512", secret).update(raw).digest("hex");

describe("verifySignature (HMAC-SHA512)", () => {
  it("accepts the signature for the exact body", () => {
    expect(verifySignature(body, sign(body), secret)).toBe(true);
  });

  it("rejects a body that was changed after signing", () => {
    expect(verifySignature(body.replace("ILH-1", "ILH-2"), sign(body), secret)).toBe(false);
  });

  it("rejects missing or malformed signatures", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "abc", secret)).toBe(false);
  });
});

describe("checkCharge", () => {
  const intent = { reference: "ILH-1", amountKobo: 886000 };
  const paid = { status: "success", reference: "ILH-1", currency: "NGN", amount: 886000 };

  it("accepts a matching successful charge", () => {
    expect(checkCharge(intent, paid)).toEqual({ ok: true });
  });

  it("refuses a different amount", () => {
    expect(checkCharge(intent, { ...paid, amount: 100 }).reason).toBe("amount_mismatch");
  });

  it("refuses failed charges and other currencies", () => {
    expect(checkCharge(intent, { ...paid, status: "failed" }).reason).toBe("status_failed");
    expect(checkCharge(intent, { ...paid, currency: "USD" }).reason).toBe("currency_mismatch");
  });
});
