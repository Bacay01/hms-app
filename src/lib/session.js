import { cookies } from "next/headers";
import { encrypt, decrypt, cookieOptions, SESSION_COOKIE } from "@/lib/jwt";
import { SESSION_HOURS } from "@/lib/config";

export async function createSession(data) {
  const token = await encrypt({ ...data, lastActive: Date.now() });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_HOURS * 60 * 60));
}

export async function getSession() {
  const store = await cookies();
  return decrypt(store.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
