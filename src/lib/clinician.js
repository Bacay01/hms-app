import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/nav";
import { ACTIVE_STATUSES } from "@/lib/queue";

// Doctors write clinical orders, only for their own patients
export async function loadForClinician(encounterId, { requireActive = false } = {}) {
  const session = await requireSession();
  if (!can(session.permissions, "clinical.write")) return { error: "Only doctors can do this." };

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, status: true, doctorId: true, patientId: true, patient: { select: { allergies: true } } },
  });
  if (!encounter) return { error: "Visit not found." };
  if (session.role === "DOCTOR" && encounter.doctorId !== session.userId) {
    return { error: "This visit belongs to another doctor." };
  }
  if (requireActive && !ACTIVE_STATUSES.includes(encounter.status)) return { error: "This visit has ended." };

  return { session, encounter };
}
