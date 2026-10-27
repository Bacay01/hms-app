"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const INVALID = "Invalid email or password.";

export async function login(prevState, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  const valid =
    user && user.isActive && (await bcrypt.compare(password, user.passwordHash));

  if (!valid) {
    return { error: INVALID };
  }

  await createSession({
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  });

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: "auth.login",
        entity: "User",
        entityId: user.id,
        userId: user.id,
        ipAddress: ip,
      },
    }),
  ]);

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
