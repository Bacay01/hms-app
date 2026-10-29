import { KeyedRateLimiter } from "@/lib/dsa/RateLimiter";
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MINUTES } from "@/lib/config";

const WINDOW_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;

// One sliding-window RateLimiter per email and per IP, kept in a Map (KeyedRateLimiter).
// Stored on globalThis so it survives hot reloads in development.
//
// Note: this lives in server memory. On serverless hosting (Vercel) every instance
// has its own copy, so production systems keep the same algorithm but store the
// timestamps in a shared store such as Redis.
const byEmail = (globalThis.__loginByEmail ??= new KeyedRateLimiter(LOGIN_MAX_ATTEMPTS, WINDOW_MS));
const byIp = (globalThis.__loginByIp ??= new KeyedRateLimiter(LOGIN_MAX_ATTEMPTS * 4, WINDOW_MS));

export function checkLoginAllowed(email, ip) {
  const now = Date.now();
  const emailOk = byEmail.allow(email, now);
  const ipOk = byIp.allow(ip, now);

  if (emailOk && ipOk) return { allowed: true };

  const waitMs = Math.max(byEmail.retryAfter(email, now), byIp.retryAfter(ip, now));
  return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(waitMs / 60000)) };
}

// A successful login clears that email's counter, so typos never lock a real user out
export function clearLoginAttempts(email) {
  byEmail.reset(email);
}
