import { prisma } from "@/lib/prisma";
import { recentFromViews } from "@/lib/recentPatients";

// The audit log is the source of truth (works on Vercel — no server memory needed).
// Opening a patient profile logs patient.view; opening a visit logs encounter.view.
export async function getRecentlyViewedPatients(userId, capacity = 8) {
  const rows = await prisma.auditLog.findMany({
    where: { userId, action: { in: ["patient.view", "encounter.view"] } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { action: true, entityId: true, createdAt: true },
  });
  if (rows.length === 0) return [];

  // Visits → their patient, in one query
  const encounterIds = [...new Set(rows.filter((r) => r.action === "encounter.view").map((r) => r.entityId))];
  const encounters = encounterIds.length
    ? await prisma.encounter.findMany({ where: { id: { in: encounterIds } }, select: { id: true, patientId: true } })
    : [];
  const patientOfVisit = new Map(encounters.map((e) => [e.id, e.patientId]));

  // Oldest first, then replay through the LRU cache
  const views = rows
    .reverse()
    .map((r) => ({
      patientId: r.action === "patient.view" ? r.entityId : patientOfVisit.get(r.entityId),
      at: r.createdAt,
    }))
    .filter((view) => view.patientId);

  const recent = recentFromViews(views, capacity);

  const patients = await prisma.patient.findMany({
    where: { id: { in: recent.map((r) => r.patientId) } },
    select: { id: true, firstName: true, lastName: true, otherNames: true, hospitalNumber: true },
  });
  const byId = new Map(patients.map((p) => [p.id, p]));

  return recent.filter((r) => byId.has(r.patientId)).map((r) => ({ ...byId.get(r.patientId), viewedAt: r.at }));
}
