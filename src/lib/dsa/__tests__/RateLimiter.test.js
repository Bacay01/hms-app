import { KeyedRateLimiter, RateLimiter } from "../RateLimiter";

describe("RateLimiter (sliding window)", () => {
  it("allows max requests per window (Module 5.10)", () => {
    const rl = new RateLimiter(3, 1000);
    expect([0, 1, 2, 3].map((t) => rl.allow(t))).toEqual([true, true, true, false]);
  });

  it("allows again once the oldest request leaves the window", () => {
    const rl = new RateLimiter(2, 1000);
    rl.allow(0);
    rl.allow(100);
    expect(rl.allow(500)).toBe(false);
    expect(rl.retryAfter(500)).toBe(500);
    expect(rl.allow(1000)).toBe(true);
  });
});

describe("KeyedRateLimiter", () => {
  it("limits each key separately", () => {
    const limiter = new KeyedRateLimiter(1, 1000);
    expect(limiter.allow("ada@hms.test", 0)).toBe(true);
    expect(limiter.allow("ada@hms.test", 10)).toBe(false);
    expect(limiter.allow("bayo@hms.test", 10)).toBe(true);
  });

  it("forgets idle keys so memory doesn't grow forever", () => {
    const limiter = new KeyedRateLimiter(1, 1000);
    limiter.allow("a", 0);
    limiter.allow("b", 5000);
    expect(limiter.size()).toBe(1);
  });
});
