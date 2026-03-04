const CLEANUP_INTERVAL_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  check(key: string): { success: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { success: true, remaining: this.maxRequests - 1, resetInSeconds: Math.ceil(this.windowMs / 1000) };
    }

    if (entry.count >= this.maxRequests) {
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
      return { success: false, remaining: 0, resetInSeconds };
    }

    entry.count++;
    const remaining = this.maxRequests - entry.count;
    const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return { success: true, remaining, resetInSeconds };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const GENERAL_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 30;
const GENERAL_WINDOW = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 60_000;

// Use globalThis to persist instances across dev mode module re-evaluations
const globalForRateLimit = globalThis as unknown as {
  generalLimiter: RateLimiter | undefined;
  authLimiter: RateLimiter | undefined;
};

export const generalLimiter = globalForRateLimit.generalLimiter ?? new RateLimiter(GENERAL_MAX, GENERAL_WINDOW);
export const authLimiter = globalForRateLimit.authLimiter ?? new RateLimiter(10, 60_000);

globalForRateLimit.generalLimiter = generalLimiter;
globalForRateLimit.authLimiter = authLimiter;
