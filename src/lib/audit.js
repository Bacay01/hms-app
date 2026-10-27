import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function audit({ action, entity, entityId = null, userId = null, details }) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await prisma.auditLog.create({
    data: { action, entity, entityId, userId, details: details ?? undefined, ipAddress: ip },
  });
}
