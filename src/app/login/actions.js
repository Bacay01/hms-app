"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createSession, deleteSession } from "@/lib/session";
import { checkLoginAllowed, clearLoginAttempts } from "@/lib/loginLimiter";

const INVALID = "Invalid email or password.";
const DB_DOWN = "Can't reach the database right now. Check your connection and try again.";

export async function login(prevState, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // Sliding-window rate limiter: checked BEFORE the password, so attackers can't keep guessing
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const gate = checkLoginAllowed(email, ip);
  if (!gate.allowed) {
    const m = gate.retryAfterMinutes;
    return { error: `Too many sign-in attempts. Try again in ${m} minute${m === 1 ? "" : "s"}.` };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  } catch (error) {
    console.error("Login database error:", error);
    return { error: DB_DOWN };
  }

  const valid =
    user && user.isActive && (await bcrypt.compare(password, user.passwordHash));

  if (!valid) {
    if (user) {
      try {
        await audit({ action: "auth.login_failed", entity: "User", entityId: user.id });
      } catch {
        // never block the response because logging failed
      }
    }
    return { error: INVALID };
  }

  clearLoginAttempts(email);

  await createSession({
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  });

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await audit({ action: "auth.login", entity: "User", entityId: user.id, userId: user.id });
  } catch (error) {
    // Don't block login if only the bookkeeping fails
    console.error("Login bookkeeping error:", error);
  }

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
