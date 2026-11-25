import crypto from "node:crypto";
import { audit } from "@/lib/audit";
import { sendRemindersFor, tomorrowDate } from "@/lib/reminders";

// Called once a day by a scheduler (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>")
function authorised(request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  const result = await sendRemindersFor(tomorrowDate());
  await audit({
    action: "reminders.cron",
    entity: "Appointment",
    details: { date: result.date, total: result.total, sent: result.sent, failed: result.failed, skipped: result.skipped },
  });
  return Response.json(result);
}
