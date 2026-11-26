"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncEncounterBill } from "@/lib/billing";

const CATEGORIES = ["CONSULTATION", "LAB", "DRUG", "BED", "PROCEDURE"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function refresh() {
  revalidatePath("/hmo");
  revalidatePath("/hmo/enrolments");
  revalidatePath("/hmo/claims");
}

export async function createHmo(prevState, formData) {
  const session = await requirePermission("hmo.manage");
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const code = String(formData.get("code") || "").trim().toUpperCase().slice(0, 12);
  const isNhia = formData.get("isNhia") === "on";
  if (name.length < 2) return { error: "Enter the HMO's name." };
  if (!/^[A-Z0-9-]{2,12}$/.test(code)) return { error: "Short code: 2–12 letters/numbers, e.g. GRN" };

  try {
    const hmo = await prisma.hmo.create({ data: { name, code, isNhia } });
    await audit({ action: "hmo.create", entity: "Hmo", entityId: hmo.id, userId: session.userId, details: { name, code } });
  } catch (e) {
    if (e?.code === "P2002") return { error: "An HMO with that name or code already exists." };
    throw e;
  }
  refresh();
  return { success: `${name} added. Now add its plans.`, savedAt: Date.now() };
}

export async function createPlan(hmoId, prevState, formData) {
  const session = await requirePermission("hmo.manage");
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  if (name.length < 2) return { error: "Enter a plan name." };

  const coverage = [];
  for (const category of CATEGORIES) {
    const percent = Number.parseInt(String(formData.get(`pct_${category}`) || "0"), 10);
    if (!(percent >= 0 && percent <= 100)) return { error: `${category}: percent must be 0–100.` };
    coverage.push({ category, percent, requiresPreauth: formData.get(`pa_${category}`) === "on" });
  }

  try {
    const plan = await prisma.hmoPlan.create({ data: { hmoId, name, coverage: { create: coverage } } });
    await audit({ action: "hmo.plan_create", entity: "HmoPlan", entityId: plan.id, userId: session.userId, details: { name, coverage } });
  } catch (e) {
    if (e?.code === "P2002") return { error: "That HMO already has a plan with this name." };
    throw e;
  }
  refresh();
  return { success: `Plan "${name}" added.`, savedAt: Date.now() };
}

// DEVELOPMENT ONLY: a fictional HMO and an illustrative NHIA-style plan
export async function loadDemoHmos() {
  const session = await requirePermission("hmo.manage");
  if (process.env.NODE_ENV === "production") return { error: "Demo HMOs are only for development." };
  if ((await prisma.hmo.count()) > 0) return { error: "HMOs already exist." };

  const cov = (consult, lab, drug, bed, proc, preauth = []) =>
    [["CONSULTATION", consult], ["LAB", lab], ["DRUG", drug], ["BED", bed], ["PROCEDURE", proc]].map(([category, percent]) => ({
      category,
      percent,
      requiresPreauth: preauth.includes(category),
    }));

  await prisma.hmo.create({
    data: {
      name: "NHIA (illustrative)",
      code: "NHIA",
      isNhia: true,
      plans: { create: [{ name: "Formal Sector", coverage: { create: cov(100, 100, 90, 100, 100, ["BED", "PROCEDURE"]) } }] },
    },
  });
  await prisma.hmo.create({
    data: {
      name: "Greenfield HMO (fictional)",
      code: "GRN",
      plans: {
        create: [
          { name: "Silver", coverage: { create: cov(100, 80, 80, 0, 0) } },
          { name: "Gold", coverage: { create: cov(100, 100, 100, 100, 100, ["BED"]) } },
        ],
      },
    },
  });
  await audit({ action: "hmo.demo_loaded", entity: "Hmo", userId: session.userId });
  refresh();
  return { success: "Loaded NHIA (illustrative) and Greenfield HMO (fictional)." };
}

export async function enrolPatient(prevState, formData) {
  const session = await requirePermission("hmo.manage");
  const hospitalNumber = String(formData.get("hospitalNumber") || "").trim().toUpperCase();
  const planId = String(formData.get("planId") || "");
  const enrolmentNumber = String(formData.get("enrolmentNumber") || "").trim().toUpperCase().slice(0, 40);
  const validUntil = String(formData.get("validUntil") || "") || null;

  const patient = await prisma.patient.findFirst({ where: { hospitalNumber, deletedAt: null }, select: { id: true, firstName: true, lastName: true } });
  if (!patient) return { error: `No patient with hospital number ${hospitalNumber || "…"}.` };
  const plan = await prisma.hmoPlan.findUnique({ where: { id: planId }, include: { hmo: true } });
  if (!plan || !plan.isActive) return { error: "Choose a plan." };
  if (enrolmentNumber.length < 3) return { error: "Enter the enrolment number from the HMO card." };
  if (validUntil && !DATE_RE.test(validUntil)) return { error: "Valid-until must be a date." };

  await prisma.$transaction([
    prisma.patientHmo.updateMany({ where: { patientId: patient.id, isActive: true }, data: { isActive: false } }),
    prisma.patientHmo.create({ data: { patientId: patient.id, planId, enrolmentNumber, validUntil, createdById: session.userId } }),
  ]);
  await audit({ action: "hmo.enrol", entity: "Patient", entityId: patient.id, userId: session.userId, details: { planId, enrolmentNumber } });

  // Re-split the patient's recent bills that aren't settled yet
  const recent = await prisma.bill.findMany({
    where: { patientId: patient.id, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    select: { encounterId: true, totalKobo: true, paidKobo: true },
  });
  for (const b of recent) if (b.paidKobo < b.totalKobo || b.totalKobo === 0) await syncEncounterBill(b.encounterId);

  refresh();
  revalidatePath("/billing");
  return { success: `${patient.firstName} ${patient.lastName} enrolled on ${plan.hmo.name} — ${plan.name}.`, savedAt: Date.now() };
}

export async function endEnrolment(prevState, formData) {
  const session = await requirePermission("hmo.manage");
  const id = String(formData.get("enrolmentId") || "");
  const done = await prisma.patientHmo.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
  if (done.count === 0) return { error: "Already ended." };
  await audit({ action: "hmo.enrol_end", entity: "PatientHmo", entityId: id, userId: session.userId });
  refresh();
  return {};
}

export async function setPreauth(itemId, prevState, formData) {
  const session = await requirePermission("hmo.manage");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9\-/]{2,39}$/.test(code)) return { error: "Enter the authorization code from the HMO." };

  const item = await prisma.billItem.findUnique({ where: { id: itemId }, include: { bill: { select: { id: true, encounterId: true } } } });
  if (!item || item.status !== "ACTIVE") return { error: "Bill line not found." };

  await prisma.billItem.update({ where: { id: itemId }, data: { preauthCode: code } });
  await syncEncounterBill(item.bill.encounterId); // now covered
  await audit({ action: "hmo.preauth", entity: "Bill", entityId: item.bill.id, userId: session.userId, details: { itemId, code } });

  revalidatePath(`/billing/${item.bill.id}`);
  revalidatePath("/billing");
  return { success: "Authorized — the HMO now covers this line." };
}

export async function submitClaim(hmoId, month, prevState, formData) {
  const session = await requirePermission("hmo.manage");
  if (!MONTH_RE.test(month)) return { error: "Choose a month." };
  const totalKobo = Number.parseInt(String(formData.get("totalKobo") || "0"), 10);
  const billCount = Number.parseInt(String(formData.get("billCount") || "0"), 10);
  if (!(totalKobo > 0)) return { error: "Nothing to claim for this month." };

  try {
    const claim = await prisma.hmoClaim.create({ data: { hmoId, month, totalKobo, billCount, submittedById: session.userId } });
    await audit({ action: "hmo.claim_submitted", entity: "HmoClaim", entityId: claim.id, userId: session.userId, details: { month, totalKobo, billCount } });
  } catch (e) {
    if (e?.code === "P2002") return { error: "This month's claim was already submitted." };
    throw e;
  }
  refresh();
  return { success: "Claim marked as submitted." };
}
