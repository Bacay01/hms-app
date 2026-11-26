"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { nairaToKobo } from "@/lib/money";

export async function createWard(prevState, formData) {
  const session = await requirePermission("staff.manage");
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const kind = String(formData.get("kind") || "").trim().slice(0, 60) || null;
  const dailyRateKobo = nairaToKobo(formData.get("rate"));
  const beds = Number.parseInt(String(formData.get("beds") || ""), 10);

  if (name.length < 2) return { error: "Enter a ward name." };
  if (!dailyRateKobo) return { error: "Enter the daily bed rate, e.g. 15000" };
  if (!(beds >= 1 && beds <= 60)) return { error: "Beds must be between 1 and 60." };

  try {
    const ward = await prisma.ward.create({
      data: { name, kind, dailyRateKobo, beds: { create: Array.from({ length: beds }, (_, i) => ({ label: `Bed ${i + 1}` })) } },
    });
    await audit({ action: "ward.create", entity: "Ward", entityId: ward.id, userId: session.userId, details: { name, beds, dailyRateKobo } });
  } catch (e) {
    if (e?.code === "P2002") return { error: `A ward called "${name}" already exists.` };
    throw e;
  }

  revalidatePath("/inpatient");
  revalidatePath("/inpatient/wards");
  return { success: `${name} created with ${beds} beds.`, savedAt: Date.now() };
}

export async function addBeds(wardId, prevState, formData) {
  const session = await requirePermission("staff.manage");
  const count = Number.parseInt(String(formData.get("count") || ""), 10);
  if (!(count >= 1 && count <= 30)) return { error: "Add between 1 and 30 beds." };

  const existing = await prisma.bed.count({ where: { wardId } });
  await prisma.bed.createMany({ data: Array.from({ length: count }, (_, i) => ({ wardId, label: `Bed ${existing + i + 1}` })) });
  await audit({ action: "ward.add_beds", entity: "Ward", entityId: wardId, userId: session.userId, details: { count } });

  revalidatePath("/inpatient");
  revalidatePath("/inpatient/wards");
  return { success: `${count} bed(s) added.` };
}
