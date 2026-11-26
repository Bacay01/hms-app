"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { formatNaira } from "@/lib/money";
import { parseAdjustment } from "@/lib/stock";

class AdjustError extends Error {}

export async function adjustStock(prevState, formData) {
  const session = await requirePermission("inventory.manage");
  const batchId = String(formData.get("batchId") || "");

  const batch = await prisma.stockBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { error: "Batch not found." };

  // Quick check for a friendly message; the real check happens again inside the lock
  const parsed = parseAdjustment(formData, batch.quantityOnHand);
  if (parsed.error) return { error: parsed.error };
  const { type, movementType, quantity, reason } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "StockBatch" WHERE id = ${batchId} FOR UPDATE`;
      const fresh = await tx.stockBatch.findUnique({ where: { id: batchId }, select: { quantityOnHand: true } });
      if (fresh.quantityOnHand + quantity < 0) {
        throw new AdjustError(`Stock changed — only ${fresh.quantityOnHand} on hand now.`);
      }
      await tx.stockBatch.update({ where: { id: batchId }, data: { quantityOnHand: { increment: quantity } } });
      await tx.stockMovement.create({
        data: { batchId, drugId: batch.drugId, type: movementType, quantity, reason, userId: session.userId },
      });
    });
  } catch (e) {
    if (e instanceof AdjustError) return { error: e.message };
    throw e;
  }

  const valueKobo = batch.costKobo != null ? Math.abs(quantity) * batch.costKobo : null;
  await audit({
    action: "stock.adjusted",
    entity: "StockBatch",
    entityId: batchId,
    userId: session.userId,
    details: { drugId: batch.drugId, batchNumber: batch.batchNumber, type, quantity, valueKobo },
  });

  revalidatePath("/pharmacy/stock");
  revalidatePath(`/pharmacy/stock/${batch.drugId}`);
  revalidatePath("/pharmacy");
  return {
    success: `${quantity > 0 ? "+" : ""}${quantity} recorded on ${batch.batchNumber}${valueKobo != null && quantity < 0 ? ` (value ${formatNaira(valueKobo)})` : ""}.`,
  };
}
