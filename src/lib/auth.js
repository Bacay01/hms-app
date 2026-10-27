import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/nav";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Call at the top of every protected page — hiding a link is not enough
export async function requirePermission(permission) {
  const session = await requireSession();
  if (!can(session.permissions, permission)) redirect("/forbidden");
  return session;
}
