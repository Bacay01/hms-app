import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hms_session";
export const SESSION_HOURS = 8;

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
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
