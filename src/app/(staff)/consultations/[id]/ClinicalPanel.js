import { prisma } from "@/lib/prisma";
import { buildNoteHistory, changedFields } from "@/lib/noteHistory";
import { formatDateTime } from "@/lib/patients";
import { saveClinicalNote } from "../clinical-actions";
import NoteEditor from "./NoteEditor";
import DiagnosisPanel from "./DiagnosisPanel";

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function ClinicalPanel({ encounterId, canWrite, visitEnded }) {
  const [notes, diagnoses] = await Promise.all([
    prisma.clinicalNote.findMany({
      where: { encounterId },
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.diagnosis.findMany({
      where: { encounterId, removedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { id: true, code: true, name: true, isPrimary: true, provisional: true },
    }),
  ]);

  // Rebuild the linked list of versions, newest first
  const { versions, intact } = buildNoteHistory(notes);
  const forClient = versions.map((v, i) => ({
    id: v.id,
    version: v.version,
    presentingComplaint: v.presentingComplaint,
    history: v.history,
    examination: v.examination,
    plan: v.plan,
    amendReason: v.amendReason,
    author: `${v.author.firstName} ${v.author.lastName}`,
    createdAt: formatDateTime(v.createdAt),
    changed: changedFields(v, versions[i + 1] ?? null),
  }));

  return (
    <>
      <Section title="Clinical note">
        <NoteEditor
          action={saveClinicalNote.bind(null, encounterId)}
          versions={forClient}
          canWrite={canWrite}
          visitEnded={visitEnded}
          intact={intact}
        />
      </Section>
      <Section title="Diagnosis">
        <DiagnosisPanel encounterId={encounterId} diagnoses={diagnoses} canWrite={canWrite} />
      </Section>
    </>
  );
}
