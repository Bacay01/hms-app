"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTempPassword() {
  return randomBytes(9).toString("base64url"); // 12 random characters
}

export async function createStaff(prevState, formData) {
  const admin = await requirePermission("staff.manage");

  const values = {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    phone: String(formData.get("phone") || "").trim(),
  };
  const roleId = String(formData.get("roleId") || "");

  if (!values.firstName || !values.lastName) {
    return { error: "First and last name are required.", values };
  }
  if (!EMAIL_RE.test(values.email)) {
    return { error: "Enter a valid email address.", values };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Choose a role.", values };

  const existing = await prisma.user.findUnique({ where: { email: values.email } });
  if (existing) return { error: "A staff member with this email already exists.", values };

  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || null,
      roleId: role.id,
      passwordHash: await bcrypt.hash(tempPassword, 12),
    },
  });

  await audit({
    action: "staff.create",
    entity: "User",
    entityId: user.id,
    userId: admin.userId,
    details: { email: user.email, role: role.name },
  });

  revalidatePath("/staff");
  return { success: `${user.firstName} ${user.lastName} was added.`, tempPassword };
}

export async function updateStaffRole(prevState, formData) {
  const admin = await requirePermission("staff.manage");
  const userId = String(formData.get("userId") || "");
  const roleId = String(formData.get("roleId") || "");

  if (userId === admin.userId) return { error: "You can't change your own role." };

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);
  if (!user || !role) return { error: "Staff member or role not found." };
  if (user.roleId === role.id) return {};

  await prisma.user.update({ where: { id: userId }, data: { roleId: role.id } });
  await audit({
    action: "staff.role_change",
    entity: "User",
    entityId: userId,
    userId: admin.userId,
    details: { from: user.role.name, to: role.name },
  });

  revalidatePath("/staff");
  return {};
}

export async function toggleStaffActive(prevState, formData) {
  const admin = await requirePermission("staff.manage");
  const userId = String(formData.get("userId") || "");

  if (userId === admin.userId) return { error: "You can't deactivate your own account." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Staff member not found." };

  const isActive = !user.isActive;
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await audit({
    action: isActive ? "staff.reactivate" : "staff.deactivate",
    entity: "User",
    entityId: userId,
    userId: admin.userId,
  });

  revalidatePath("/staff");
  return {};
}

export async function resetStaffPassword(prevState, formData) {
  const admin = await requirePermission("staff.manage");
  const userId = String(formData.get("userId") || "");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Staff member not found." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(tempPassword, 12) },
  });
  await audit({
    action: "staff.password_reset",
    entity: "User",
    entityId: userId,
    userId: admin.userId,
  });

  return { tempPassword };
}
