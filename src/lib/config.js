// Session timing, shared by server and client (no secrets here)
export const SESSION_HOURS = 8; // absolute maximum session length
export const IDLE_MINUTES = 30; // log out after this long with no activity

// Login protection (sliding-window rate limiter)
export const LOGIN_MAX_ATTEMPTS = 5; // per email
export const LOGIN_WINDOW_MINUTES = 15;
