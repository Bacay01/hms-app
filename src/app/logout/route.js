import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

// Clears the session cookie (used when a deactivated user is kicked out)
export async function GET(request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
