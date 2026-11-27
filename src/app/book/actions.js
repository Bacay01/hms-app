"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { KeyedRateLimiter } from "@/lib/dsa/RateLimiter";
import { parseBookingRequest, requestReference } from "@/lib/bookingRequest";
import { maskPhone } from "@/lib/reminderText";
import { localDate } from "@/lib/time";

// 5 requests per connection per hour — same sliding-window limiter as the staff login
const byIp = (globalThis.__bookingByIp ??= new KeyedRateLimiter(5, 60 * 60 * 1000));

const KEEP = ["fullName", "phone", "departmentId", "preferredDate", "preferredTime", "reason"];

export async function requestAppointment(prevState, formData) {
  const input = Object.fromEntries(formData);
  const values = Object.fromEntries(KEEP.map((k) => [k, String(input[k] ?? "")]));

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!byIp.allow(ip)) {
    return { values, error: "Too many requests from this connection. Please try again in an hour, or call the hospital." };
  }

  const departments = await prisma.department.findMany({ where: { isActive: true }, select: { id: true } });
  const parsed = parseBookingRequest(input, { today: localDate(), departmentIds: departments.map((d) => d.id) });

  if (parsed.spam) return { done: true }; // look successful, save nothing
  if (parsed.errors) return { values, errors: parsed.errors };

  const { data } = parsed;

  // Already waiting for a call back? Don't stack duplicates on reception's list.
  const waiting = await prisma.appointmentRequest.findFirst({ where: { phone: data.phone, status: "NEW" } });
  if (waiting) {
    return { done: true, duplicate: true, reference: requestReference(waiting.id), phone: maskPhone(waiting.phone) };
  }

  const request = await prisma.appointmentRequest.create({
    data: {
      ...data,
      preferredDate: new Date(`${data.preferredDate}T00:00:00Z`),
      consentAt: new Date(),
      ipAddress: ip === "local" ? null : ip,
    },
  });
  await audit({
    action: "appointmentRequest.create",
    entity: "AppointmentRequest",
    entityId: request.id,
    details: { preferredDate: data.preferredDate, preferredTime: data.preferredTime },
  });

  return { done: true, reference: requestReference(request.id), phone: maskPhone(request.phone) };
}
