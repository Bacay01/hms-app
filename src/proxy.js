import { NextResponse } from "next/server";
import { decrypt, encrypt, cookieOptions, SESSION_COOKIE } from "@/lib/jwt";
import { IDLE_MINUTES } from "@/lib/config";

// Every staff area of the app — must be logged in
const PROTECTED = [
  "/dashboard",
  "/patients",
  "/appointments",
  "/consultations",
  "/lab",
  "/pharmacy",
  "/billing",
  "/hmo",
  "/reports",
  "/staff",
  "/audit",
  "/forbidden",
];

const IDLE_MS = IDLE_MINUTES * 60 * 1000;
// Refresh the "last active" time at most about once a minute
const REFRESH_MS = Math.min(60 * 1000, IDLE_MS / 2);

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const isProtected = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!session) {
    if (isProtected) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  const now = Date.now();
  const lastActive = session.lastActive ?? session.iat * 1000;
  const idleFor = now - lastActive;

  // Idle too long: clear the session
  if (idleFor > IDLE_MS) {
    const response = isProtected
      ? NextResponse.redirect(new URL("/login?reason=idle", request.url))
      : NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Active on a staff page: slide the idle window forward (keep original expiry)
  if (isProtected && idleFor > REFRESH_MS) {
    const { iat, exp, ...data } = session;
    const token = await encrypt({ ...data, lastActive: now }, exp);
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, token, cookieOptions(exp - Math.floor(now / 1000)));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
