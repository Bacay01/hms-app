import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { claimLines } from "@/lib/hmoClaims";
import { localDate } from "@/lib/time";

export async function GET(request) {
  await requirePermission("hmo.manage");
  const params = new URL(request.url).searchParams;
  const hmoId = params.get("hmo") ?? "";
  const month = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month") : localDate().slice(0, 7);

  const hmo = await prisma.hmo.findUnique({ where: { id: hmoId }, select: { code: true } });
  if (!hmo) return new Response("HMO not found", { status: 404 });

  const { bills } = await claimLines(hmoId, month);
  const naira = (kobo) => (kobo / 100).toFixed(2);
  const rows = bills.flatMap((b) =>
    b.items.map((i) => [
      localDate(b.encounter.startedAt),
      b.patient.hospitalNumber,
      [b.patient.firstName, b.patient.otherNames, b.patient.lastName].filter(Boolean).join(" "),
      b.enrolmentNo,
      b.hmoPlanName,
      i.description,
      i.category,
      i.quantity,
      i.preauthCode ?? "",
      naira(i.amountKobo),
      naira(i.hmoKobo),
    ])
  );
  const csv = toCsv(
    ["Visit date", "Hospital no.", "Patient", "Enrolment no.", "Plan", "Item", "Category", "Qty", "Pre-auth code", "Amount (NGN)", "HMO pays (NGN)"],
    rows
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="claim-${hmo.code}-${month}.csv"`,
    },
  });
}
