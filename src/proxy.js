import { NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/jwt";

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
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
