// Module 5.10 — Sliding-window rate limiter, built on our linked-list Queue.
// Keeps a queue of timestamps. Old timestamps leave from the front (FIFO);
// if the queue still holds `max` items, the request is refused.
// Used for: login protection (3B-2).

import { Queue } from "./Queue";

export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.max = maxRequests;
    this.window = windowMs;
    this.times = new Queue();
  }

  _evictOld(now) {
    while (!this.times.isEmpty() && now - this.times.peek() >= this.window) {
      this.times.dequeue();
    }
  }

  allow(now = Date.now()) {              // amortized O(1)
    this._evictOld(now);
    if (this.times.size() < this.max) {
      this.times.enqueue(now);
      return true;
    }
    return false;
  }

  // Milliseconds until the next request would be allowed (0 = allowed now)
  retryAfter(now = Date.now()) {
    this._evictOld(now);
    if (this.times.size() < this.max) return 0;
    return this.window - (now - this.times.peek());
  }

  isIdle(now = Date.now()) {
    this._evictOld(now);
    return this.times.isEmpty();
  }
}

// One limiter per key (e.g. per email address) — Map gives O(1) lookup.
export class KeyedRateLimiter {
  constructor(maxRequests, windowMs) {
    this.max = maxRequests;
    this.window = windowMs;
    this.limiters = new Map();
  }

  _get(key) {
    if (!this.limiters.has(key)) this.limiters.set(key, new RateLimiter(this.max, this.window));
    return this.limiters.get(key);
  }

  allow(key, now = Date.now()) {
    this._cleanup(now);
    return this._get(key).allow(now);
  }

  retryAfter(key, now = Date.now()) {
    return this.limiters.has(key) ? this.limiters.get(key).retryAfter(now) : 0;
  }

  reset(key) {
    this.limiters.delete(key);
  }

  size() {
    return this.limiters.size;
  }

  // Drop limiters with no recent requests so memory doesn't grow forever
  _cleanup(now) {
    for (const [key, limiter] of this.limiters) {
      if (limiter.isIdle(now)) this.limiters.delete(key);
    }
  }
}
