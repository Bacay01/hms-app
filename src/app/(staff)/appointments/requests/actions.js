"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

// BOOKED after reception has made the real appointment; DECLINED with a short note (couldn't reach, duplicate…)
export async function closeRequest(prevState, formData) {
  const session = await requirePermission("appointments.manage");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const staffNote = String(formData.get("staffNote") || "").trim().slice(0, 200) || null;
  if (!["BOOKED", "DECLINED"].includes(status)) return { error: "Unknown action." };
  if (status === "DECLINED" && !staffNote) return { error: "Add a short note saying why." };

  // Only a request that is still NEW — two receptionists can't both handle it
  const updated = await prisma.appointmentRequest.updateMany({
    where: { id, status: "NEW" },
    data: { status, staffNote, handledById: session.userId, handledAt: new Date() },
  });
  if (updated.count === 0) return { error: "Someone else has just handled this request." };

  await audit({
    action: `appointmentRequest.${status.toLowerCase()}`,
    entity: "AppointmentRequest",
    entityId: id,
    userId: session.userId,
    details: staffNote ? { note: staffNote } : undefined,
  });
  revalidatePath("/appointments/requests");
  return { ok: true };
}
