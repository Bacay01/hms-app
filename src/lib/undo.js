import { prisma } from "@/lib/prisma";
import { replayUndoLog } from "@/lib/undoLog";
import { dayRange, localDate } from "@/lib/time";

export const UNDO_MINUTES = 5;

// The current user's most recent queue move today that can still be undone, or null.
export async function getUndoableAction(userId) {
  const { start } = dayRange(localDate());

  const entries = await prisma.auditLog.findMany({
    where: {
      userId,
      action: { in: ["encounter.status", "encounter.status_undo"] },
      createdAt: { gte: start },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, action: true, entityId: true, details: true, createdAt: true },
  });

  const top = replayUndoLog(entries).peek();
  if (!top) return null;
  if (Date.now() - top.createdAt.getTime() > UNDO_MINUTES * 60 * 1000) return null;

  const encounter = await prisma.encounter.findUnique({
    where: { id: top.entityId },
    select: {
      status: true,
      queueNumber: true,
      patient: { select: { firstName: true, lastName: true, otherNames: true } },
    },
  });

  // Someone else moved this patient since — undoing would overwrite their work
  if (!encounter || encounter.status !== top.details?.to) return null;

  return {
    auditId: top.id,
    encounterId: top.entityId,
    from: top.details.from,
    to: top.details.to,
    queueNumber: encounter.queueNumber,
    patient: encounter.patient,
  };
}
