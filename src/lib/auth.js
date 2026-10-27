import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";

// Checks the cookie AND the database on every request, so role changes
// apply immediately and deactivated staff are logged out at once.
// cache() makes it run once per request even if called several times.
export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!user || !user.isActive) redirect("/logout");

  return {
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
});

// Call at the top of every protected page — hiding a link is not enough
export async function requirePermission(permission) {
  const session = await requireSession();
  if (!can(session.permissions, permission)) redirect("/forbidden");
  return session;
}
