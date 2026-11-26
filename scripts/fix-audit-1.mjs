// Audit fixes, batch 1. Run once from the project folder: node scripts/fix-audit-1.mjs
import fs from "node:fs";

let failed = false;
function patch(file, edits) {
  let src = fs.readFileSync(file, "utf8");
  for (const [find, replace, label] of edits) {
    const hits = typeof find === "string" ? src.split(find).length - 1 : (src.match(new RegExp(find.source, "g")) || []).length;
    if (src.includes(replace.trim().split("\n")[0]) && hits === 0) { console.log(`= ${file}: ${label} (already done)`); continue; }
    if (hits !== 1) { console.log(`✗ ${file}: ${label} — found ${hits} matches, skipped`); failed = true; continue; }
    src = src.replace(find, replace);
    console.log(`✓ ${file}: ${label}`);
  }
  fs.writeFileSync(file, src);
}

// 1. Simulated gateway can't run in production unless you deliberately allow it (for a demo deployment)
patch("src/lib/paystack.js", [[
  'const SIMULATED = process.env.PAYMENT_GATEWAY === "simulated";',
  'const SIMULATED =\n  process.env.PAYMENT_GATEWAY === "simulated" &&\n  (process.env.NODE_ENV !== "production" || process.env.ALLOW_SIMULATED_GATEWAY === "yes");\nexport const simulatedGatewayOn = SIMULATED;',
  "simulated gateway switched off in production",
]]);
patch("src/app/pay/simulated/[reference]/page.js", [
  ['import { simulateCharge } from "./actions";', 'import { simulateCharge } from "./actions";\nimport { simulatedGatewayOn } from "@/lib/paystack";', "import"],
  ['if (process.env.PAYMENT_GATEWAY !== "simulated") notFound();', "if (!simulatedGatewayOn) notFound();", "guard"],
]);
patch("src/app/pay/simulated/[reference]/actions.js", [
  ['import { prisma } from "@/lib/prisma";', 'import { prisma } from "@/lib/prisma";\nimport { simulatedGatewayOn } from "@/lib/paystack";', "import"],
  ['if (process.env.PAYMENT_GATEWAY !== "simulated") throw', "if (!simulatedGatewayOn) throw", "guard"],
]);

// 2. Demo-account buttons on the login page: development only
patch("src/app/login/LoginForm.js", [
  ["export default function LoginForm() {", 'const SHOW_DEMO = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "yes";\n\nexport default function LoginForm() {', "SHOW_DEMO flag"],
  ['      <details className="mt-6 rounded-2xl', '      {SHOW_DEMO && (\n      <details className="mt-6 rounded-2xl', "wrap start"],
  ["      </details>\n    </div>", "      </details>\n      )}\n    </div>", "wrap end"],
]);

// 3. The queue can no longer "Complete visit" — that skipped the note, diagnosis and outcome checks
patch("src/lib/queue.js", [[
  'WITH_DOCTOR: [{ to: "COMPLETED", label: "Complete visit", permissions: ["clinical.write"] }],',
  "WITH_DOCTOR: [], // finished only from the consultation page (note + diagnosis + outcome required)",
  "remove queue shortcut",
]]);

// 4. completeVisit: one transaction, and the appointment is marked completed too
patch("src/app/(staff)/consultations/visit-actions.js", [[
  /  const result = await prisma\.encounter\.updateMany\(\{\n    where: \{ id: encounterId, status: "WITH_DOCTOR" \},[\s\S]*?admittingDoctorId: session\.userId, reason: outcomeNote \},\n    \}\);\n  \}\n/,
  `  let done = false;
  await prisma.$transaction(async (tx) => {
    const result = await tx.encounter.updateMany({
      where: { id: encounterId, status: "WITH_DOCTOR" },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        outcome,
        outcomeNote,
        referredTo: outcome === "REFERRED" ? referredTo : null,
      },
    });
    if (result.count === 0) return;
    await tx.appointment.updateMany({ where: { encounterId, status: "CHECKED_IN" }, data: { status: "COMPLETED" } });
    if (outcome === "ADMITTED") {
      // The ward assigns a bed from the Inpatient screen
      await tx.admission.create({
        data: { encounterId, patientId: encounter.patientId, admittingDoctorId: session.userId, reason: outcomeNote },
      });
    }
    done = true;
  });
  if (!done) return { error: "This visit was just updated by someone else. Reload the page." };
`,
  "transaction + appointment status",
]]);

// 5. Enforce the seeded permissions prescriptions.write and lab.requests.create
patch("src/lib/clinician.js", [
  ["export async function loadForClinician(encounterId, { requireActive = false } = {}) {", 'export async function loadForClinician(encounterId, { requireActive = false, permission = "clinical.write" } = {}) {', "permission option"],
  ['if (!can(session.permissions, "clinical.write")) return { error: "Only doctors can do this." };', 'if (!can(session.permissions, "clinical.write") || !can(session.permissions, permission)) return { error: "Your role can\'t do this." };', "check it"],
]);
patch("src/app/(staff)/consultations/orders-actions.js", [
  ["export async function addPrescription(encounterId, prevState, formData) {\n  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });",
   'export async function addPrescription(encounterId, prevState, formData) {\n  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true, permission: "prescriptions.write" });', "addPrescription"],
  ["export async function requestLab(encounterId, prevState, formData) {\n  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });",
   'export async function requestLab(encounterId, prevState, formData) {\n  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true, permission: "lab.requests.create" });', "requestLab"],
  // 6. Cancels only succeed if the item is STILL pending (pharmacy/lab may have just acted on it)
  ['  await prisma.prescription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });',
   '  const cancelled = await prisma.prescription.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date() } });\n  if (cancelled.count === 0) return { error: "The pharmacy has just dispensed this — it can no longer be cancelled." };', "cancelPrescription race"],
  ['  await prisma.labRequest.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });',
   '  const cancelled = await prisma.labRequest.updateMany({ where: { id, status: "REQUESTED" }, data: { status: "CANCELLED", cancelledAt: new Date() } });\n  if (cancelled.count === 0) return { error: "The lab has just taken the sample — ask the lab to cancel it." };', "cancelLab race"],
]);

// 7. Saving results can't reopen results that were verified a moment ago; amendments keep the old values in the audit log
patch("src/app/(staff)/lab/[id]/actions.js", [
  ["export async function saveResults(", "class LabError extends Error {}\n\nexport async function saveResults(", "LabError"],
  [/  await prisma\.\$transaction\(\[\n    prisma\.labResult\.deleteMany[\s\S]*?\n  \]\);\n/,
  `  const previous = amending
    ? await prisma.labResult.findMany({ where: { labRequestId }, select: { analyteCode: true, value: true } })
    : [];

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.labRequest.updateMany({
        where: { id: labRequestId, status: { in: ["IN_PROGRESS", "RESULTED"] } },
        data: { status: "RESULTED", resultedAt: new Date(), resultedById: session.userId, resultComment: comment, returnNote: null },
      });
      if (claimed.count === 0) throw new LabError("These results were just verified or changed by someone else. Reload the page.");
      await tx.labResult.deleteMany({ where: { labRequestId } });
      await tx.labResult.createMany({ data: rows });
    });
  } catch (e) {
    if (e instanceof LabError) return { error: e.message };
    throw e;
  }
`, "conditional save"],
  ["details: { analytes: rows.length, flagged:", "details: { previous: previous.map((r) => `${r.analyteCode}=${r.value}`), analytes: rows.length, flagged:", "keep old values"],
]);

// 8. CSV: a name like =HYPERLINK(...) must not run as a formula when opened in Excel
patch("src/lib/csv.js", [[
  '  const s = v === null || v === undefined ? "" : String(v);',
  '  let s = v === null || v === undefined ? "" : String(v);\n  // Formula injection: text starting with = + - @ is shown as text (plain numbers like -500 are left alone)\n  if (/^[=+\\-@\\t\\r]/.test(s) && !/^-?\\d+(\\.\\d+)?$/.test(s)) s = `\'${s}`;',
  "formula injection guard",
]]);

// 9. Basic security headers on every page
patch("next.config.mjs", [[
  "  cacheComponents: true,",
  `  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },`,
  "security headers",
]]);

console.log(failed ? "\nSome edits were skipped — paste this output to Claude." : "\nAll edits applied.");
