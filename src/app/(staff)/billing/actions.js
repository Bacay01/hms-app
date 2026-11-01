"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { defaultPriceList } from "@/lib/defaultPrices";
import { formatNaira, nairaToKobo } from "@/lib/money";

const CATEGORIES = ["CONSULTATION", "LAB", "DRUG", "PROCEDURE", "BED", "OTHER"];
const MAX_KOBO = 10_000_000 * 100; // ₦10 million per unit

function refresh() {
  revalidatePath("/billing/prices");
  revalidatePath("/billing");
}

// Adds any default services that don't exist yet. Never overwrites a price the Admin set.
export async function loadDefaultPrices(prevState, formData) {
  const session = await requirePermission("billing.refunds.approve");
  const result = await prisma.servicePrice.createMany({ data: defaultPriceList(), skipDuplicates: true });

  await audit({ action: "price.load_defaults", entity: "ServicePrice", userId: session.userId, details: { added: result.count } });
  refresh();
  return { success: result.count ? `${result.count} services added.` : "All default services are already on the list." };
}

export async function updatePrice(prevState, formData) {
  const session = await requirePermission("billing.refunds.approve");
  const code = String(formData.get("code") || "");
  const priceKobo = nairaToKobo(formData.get("price"));
  const isActive = formData.get("isActive") === "on";

  if (priceKobo === null || priceKobo > MAX_KOBO) return { error: "Enter a valid price, e.g. 2500 or 2,500.50" };

  const before = await prisma.servicePrice.findUnique({ where: { code } });
  if (!before) return { error: "Service not found." };
  if (before.priceKobo === priceKobo && before.isActive === isActive) return { success: "No change." };

  await prisma.servicePrice.update({ where: { code }, data: { priceKobo, isActive } });
  await audit({
    action: "price.update",
    entity: "ServicePrice",
    entityId: before.id,
    userId: session.userId,
    details: { code, fromKobo: before.priceKobo, toKobo: priceKobo, isActive },
  });

  refresh();
  return { success: `Saved: ${formatNaira(priceKobo)}${isActive ? "" : " (inactive)"}` };
}

export async function addService(prevState, formData) {
  const session = await requirePermission("billing.refunds.approve");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const category = String(formData.get("category") || "");
  const unit = String(formData.get("unit") || "").trim().slice(0, 30) || "item";
  const priceKobo = nairaToKobo(formData.get("price"));

  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code)) return { error: "Code: 3–40 letters, numbers or dashes, e.g. PROC-DRESSING" };
  if (!name) return { error: "Enter a name." };
  if (!CATEGORIES.includes(category)) return { error: "Choose a category." };
  if (priceKobo === null || priceKobo > MAX_KOBO) return { error: "Enter a valid price." };

  try {
    const created = await prisma.servicePrice.create({ data: { code, name, category, unit, priceKobo } });
    await audit({ action: "price.add", entity: "ServicePrice", entityId: created.id, userId: session.userId, details: { code, priceKobo } });
  } catch (e) {
    if (e?.code === "P2002") return { error: `A service with code ${code} already exists.` };
    throw e;
  }

  refresh();
  return { success: `${name} added.`, savedAt: code };
}
