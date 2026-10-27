import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

// Clears the session cookie (deactivated users, idle timeout)
export async function GET(request) {
  const reason = new URL(request.url).searchParams.get("reason");
  const target = reason === "idle" ? "/login?reason=idle" : "/login";
  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
