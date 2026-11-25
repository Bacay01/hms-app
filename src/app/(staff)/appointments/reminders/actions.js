"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendRemindersFor, tomorrowDate } from "@/lib/reminders";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function runReminders(prevState, formData) {
  const session = await requirePermission("appointments.manage");
  const requested = String(formData.get("date") || "");
  const date = DATE_RE.test(requested) ? requested : tomorrowDate();

  const result = await sendRemindersFor(date);
  await audit({
    action: "reminders.run",
    entity: "Appointment",
    userId: session.userId,
    details: { date, total: result.total, sent: result.sent, failed: result.failed, skipped: result.skipped },
  });

  revalidatePath("/appointments/reminders");
  return { ...result, savedAt: Date.now() };
}
