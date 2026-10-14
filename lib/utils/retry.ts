/**
 * Conextion - Resilient Retry Utility
 * Implements exponential backoff with full jitter for external network dependencies.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 200,
  maxDelayMs: 3000,
  backoffFactor: 2,
  shouldRetry: () => true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let attempt = 0;
  let delay = opts.initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }

      // Compute exponential backoff with jitter
      // Full jitter: random between 0 and min(maxDelay, delay * backoffFactor)
      const calculatedDelay = Math.min(opts.maxDelayMs, delay * Math.pow(opts.backoffFactor, attempt - 1));
      const jitteredDelay = Math.floor(Math.random() * calculatedDelay);

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
      delay = calculatedDelay;
    }
  }
}
