/**
 * In-memory sliding window rate limiter.
 * Returns HTTP 429 with Retry-After and X-RateLimit-* headers.
 */
class RateLimiterStore {
  constructor() {
    this.store = new Map();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entries] of this.store) {
      const valid = entries.filter((t) => t > now);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, valid);
      }
    }
  }

  hit(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const entries = (this.store.get(key) || []).filter((t) => t > windowStart);
    entries.push(now);
    this.store.set(key, entries);
    return entries.length;
  }

  getCount(key, windowMs) {
    const windowStart = Date.now() - windowMs;
    return (this.store.get(key) || []).filter((t) => t > windowStart).length;
  }
}

const globalStore = new RateLimiterStore();

// Clean up every 5 minutes
setInterval(() => globalStore.cleanup(), 300_000).unref();

/**
 * Creates rate-limiting middleware.
 * @param {object} opts
 * @param {number} opts.maxRequests - Maximum requests in window
 * @param {number} opts.windowMs - Window duration in ms
 * @param {function} [opts.keyGenerator] - Custom key generator (default: IP)
 */
export function rateLimit({ maxRequests, windowMs, keyGenerator }) {
  return (req, res, next) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.ip}:${req.route?.path || req.path}`;

    const count = globalStore.hit(key, windowMs);
    const remaining = Math.max(0, maxRequests - count);

    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));

    if (count > maxRequests) {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}
