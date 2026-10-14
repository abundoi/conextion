/**
 * Conextion - In-Memory & Edge Rate Limiter
 * Implements a sliding-window counter algorithm with automatic cleanup.
 */

export interface RateLimitConfig {
  windowMs: number; // Duration of window in milliseconds
  maxRequests: number; // Max allowed requests within window
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

interface RequestRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically remove stale keys every 5 minutes in long-running processes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside current sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const resetAt = Math.ceil((now + config.windowMs) / 1000);

    if (record.timestamps.length >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt,
      };
    }

    // Record this request
    record.timestamps.push(now);
    const remaining = config.maxRequests - record.timestamps.length;

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      resetAt,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const maxWindow = 15 * 60 * 1000; // 15 minutes max
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > now - maxWindow);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter();

// Tiered Rate Limit Configurations for Different Endpoint Classes
export const RATE_LIMITS = {
  // Auth endpoints: sign-in, verification, password recovery
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  // General API requests
  standard: { windowMs: 60 * 1000, maxRequests: 120 },
  // Discovery feed browsing
  discovery: { windowMs: 60 * 1000, maxRequests: 60 },
  // Member interactions (likes/passes)
  interactions: { windowMs: 60 * 1000, maxRequests: 60 },
  // Chat messaging
  messages: { windowMs: 60 * 1000, maxRequests: 60 },
  // File uploads
  uploads: { windowMs: 60 * 1000, maxRequests: 15 },
  // Moderation / reporting
  reports: { windowMs: 60 * 1000, maxRequests: 20 },
  // Admin health / diagnostic probes
  health: { windowMs: 60 * 1000, maxRequests: 300 },
} as const;
