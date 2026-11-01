import { formatNaira } from "@/lib/money";

// Is this discount/refund allowed against the bill as it stands? Returns an error message, or null.
// Discount: at most what is still owed. Refund: at most the credit (paid more than the bill totals).
export function checkAdjustment({ type, amountKobo, totalKobo, paidKobo }) {
  if (!(amountKobo > 0)) return "Enter an amount greater than zero.";

  if (type === "DISCOUNT") {
    const outstanding = totalKobo - paidKobo;
    if (outstanding <= 0) return "Nothing is outstanding to discount.";
    if (amountKobo > outstanding) return `A discount can't be more than the outstanding ${formatNaira(outstanding)}.`;
    return null;
  }

  if (type === "REFUND") {
    const credit = paidKobo - totalKobo;
    if (credit <= 0) return "There's no credit to refund. Cancel the unused order first so the bill shows a credit.";
    if (amountKobo > credit) return `A refund can't be more than the credit of ${formatNaira(credit)}.`;
    return null;
  }

  return "Choose discount or refund.";
}
