"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DRUGS } from "@/lib/drugs";
import { units } from "@/lib/prescribing";
import { addDays, parseBatchForm } from "@/lib/stock";
import { localDate } from "@/lib/time";

class StockError extends Error {}

export async function receiveStock(prevState, formData) {
  const session = await requirePermission("inventory.manage");
  const parsed = parseBatchForm(formData, localDate());
  if (parsed.error) return { error: parsed.error };
  const { drug, batchNumber, expiryDate, quantity, costKobo, supplier } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.stockBatch.findUnique({ where: { drugId_batchNumber: { drugId: drug.id, batchNumber } } });
      let batch;
      if (existing) {
        // Same batch delivered again: top it up — but the expiry printed on the pack must match
        if (existing.expiryDate !== expiryDate) {
          throw new StockError(`Batch ${batchNumber} is already recorded with expiry ${existing.expiryDate}. Check the pack.`);
        }
        batch = await tx.stockBatch.update({
          where: { id: existing.id },
          data: { quantityReceived: { increment: quantity }, quantityOnHand: { increment: quantity } },
        });
      } else {
        batch = await tx.stockBatch.create({
          data: { drugId: drug.id, batchNumber, expiryDate, supplier, costKobo, quantityReceived: quantity, quantityOnHand: quantity, receivedById: session.userId },
        });
      }
      // The ledger row — written in the SAME transaction as the on-hand change
      await tx.stockMovement.create({
        data: { batchId: batch.id, drugId: drug.id, type: "RECEIVED", quantity, reason: supplier ? `From ${supplier}` : null, userId: session.userId },
      });
    });
  } catch (e) {
    if (e instanceof StockError) return { error: e.message };
    throw e;
  }

  await audit({
    action: "stock.received",
    entity: "StockBatch",
    userId: session.userId,
    details: { drugId: drug.id, batchNumber, quantity, expiryDate },
  });
  revalidatePath("/pharmacy");
  revalidatePath(`/pharmacy/stock/${drug.id}`);
  return { success: `Received ${units(quantity, drug.unit)} of ${drug.name} (batch ${batchNumber}).`, savedAt: Date.now() };
}

// DEVELOPMENT ONLY: realistic stock for every drug, written through the ledger like real deliveries
export async function loadDemoStock(prevState, formData) {
  const session = await requirePermission("inventory.manage");
  if (process.env.NODE_ENV === "production") return { error: "Demo stock is only available in development." };
  if ((await prisma.stockBatch.count()) > 0) return { error: "Stock already exists — demo stock is only for an empty pharmacy." };

  const today = localDate();
  const batches = [];
  for (const d of DRUGS) {
    const code = d.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
    const add = (suffix, days, qty) =>
      batches.push({
        drugId: d.id,
        batchNumber: `DEMO-${code}-${suffix}`,
        expiryDate: addDays(today, days),
        supplier: "Demo supplier",
        quantityReceived: qty,
        quantityOnHand: qty,
        receivedById: session.userId,
      });

    if (d.id === "fluoxetine-20") continue; // OUT of stock
    if (d.id === "warfarin-5") {
      add("A", 400, 10); // LOW
      continue;
    }
    if (d.id === "paracetamol-500") add("X", -5, 40); // EXPIRED batch still on the shelf
    add("A", 60, 30); // expires within 90 days → EXPIRING
    add("B", 400, 200);
  }

  await prisma.$transaction(
    async (tx) => {
      const created = await tx.stockBatch.createManyAndReturn({ data: batches, select: { id: true, drugId: true, quantityOnHand: true } });
      await tx.stockMovement.createMany({
        data: created.map((b) => ({ batchId: b.id, drugId: b.drugId, type: "RECEIVED", quantity: b.quantityOnHand, reason: "Demo stock", userId: session.userId })),
      });
    },
    { timeout: 30_000 }
  );

  await audit({ action: "stock.demo_loaded", entity: "StockBatch", userId: session.userId, details: { batches: batches.length } });
  revalidatePath("/pharmacy");
  return { success: `Loaded ${batches.length} demo batches.` };
}
