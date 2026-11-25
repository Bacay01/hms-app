import { prisma } from "@/lib/prisma";
import { JobQueue } from "@/lib/dsa/JobQueue";
import { withRetry } from "@/lib/retry";
import { buildReminderMessage, maskPhone, normalizeNgPhone } from "@/lib/reminderText";
import { sendSms } from "@/lib/sms";
import { SITE } from "@/lib/site";
import { dayRange, localDate } from "@/lib/time";

export const REMINDER_CONCURRENCY = 3;

export function tomorrowDate() {
  const noonToday = new Date(`${localDate()}T12:00:00+01:00`);
  return localDate(new Date(noonToday.getTime() + 24 * 60 * 60 * 1000));
}

function record(appointmentId, data) {
  return prisma.appointmentReminder.upsert({
    where: { appointmentId_kind: { appointmentId, kind: "DAY_BEFORE" } },
    create: { appointmentId, kind: "DAY_BEFORE", ...data },
    update: data,
  });
}

// Remind everyone booked on `dateStr`. Anyone already reminded is skipped, so it's safe to run again.
export async function sendRemindersFor(dateStr) {
  const { start, end } = dayRange(dateStr);
  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: "BOOKED",
      reminders: { none: { kind: "DAY_BEFORE", status: "SENT" } },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      patient: { select: { firstName: true, phone: true } },
      doctor: { select: { lastName: true, consultingRoom: true } },
    },
  });

  const counts = { sent: 0, failed: 0, skipped: 0 };

  // Each appointment is a job: at most REMINDER_CONCURRENCY send at once, in FIFO order
  const queue = new JobQueue(async (appt) => {
    const phone = normalizeNgPhone(appt.patient.phone);
    if (!phone) {
      counts.skipped++;
      await record(appt.id, { status: "SKIPPED", error: "No valid mobile number", attempts: 0, toPhoneMasked: null });
      return;
    }

    const message = buildReminderMessage({
      firstName: appt.patient.firstName,
      doctorLastName: appt.doctor.lastName,
      room: appt.doctor.consultingRoom,
      scheduledAt: appt.scheduledAt,
      hospitalName: SITE.name,
    });

    let attempts = 0;
    try {
      await withRetry(async () => {
        attempts++;
        await sendSms(phone, message);
      });
      counts.sent++;
      await record(appt.id, { status: "SENT", attempts, error: null, toPhoneMasked: maskPhone(phone), message, sentAt: new Date() });
    } catch (err) {
      counts.failed++;
      await record(appt.id, { status: "FAILED", attempts, error: err.message, toPhoneMasked: maskPhone(phone), message });
      throw err; // the JobQueue counts it as failed
    }
  }, REMINDER_CONCURRENCY);

  const startedAt = Date.now();
  queue.addAll(appointments);
  await queue.onIdle();

  return { date: dateStr, total: appointments.length, ...counts, ms: Date.now() - startedAt, stats: queue.stats() };
}
