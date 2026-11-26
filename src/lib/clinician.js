import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/nav";
import { ACTIVE_STATUSES } from "@/lib/queue";
import { isInpatient } from "@/lib/admissions";

// Doctors write clinical orders, only for their own patients.
// "Active" = the visit is still in progress OR the patient is currently admitted.
export async function loadForClinician(encounterId, { requireActive = false, permission = "clinical.write" } = {}) {
  const session = await requireSession();
  if (!can(session.permissions, "clinical.write") || !can(session.permissions, permission)) return { error: "Your role can't do this." };

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, status: true, doctorId: true, patientId: true, patient: { select: { allergies: true } } },
  });
  if (!encounter) return { error: "Visit not found." };
  if (session.role === "DOCTOR" && encounter.doctorId !== session.userId) {
    return { error: "This visit belongs to another doctor." };
  }
  if (requireActive && !ACTIVE_STATUSES.includes(encounter.status) && !(await isInpatient(encounterId))) {
    return { error: "This visit has ended." };
  }

  return { session, encounter };
}
