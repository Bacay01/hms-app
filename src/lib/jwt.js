import { SignJWT, jwtVerify } from "jose";
import { SESSION_HOURS } from "@/lib/config";

export const SESSION_COOKIE = "hms_session";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

// expiresAt: keep an existing session's original expiry when refreshing it
export async function encrypt(payload, expiresAt) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? `${SESSION_HOURS}h`)
    .sign(key);
}

export async function decrypt(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
