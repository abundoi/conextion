/**
 * Conextion - Production Structured JSON Logger
 * Incorporates automated PII scrubbing, correlation tracking, and Cloud Logging compatibility.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

// Sensitive keys whose values must be masked in logs
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "__session",
  "creditcard",
  "cardnumber",
  "cvv",
  "ssn",
  "dob",
  "birthdate",
]);

/**
 * Recursively masks sensitive fields and patterns (emails, tokens, passwords)
 */
export function scrubPii(obj: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated: Max Depth]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Mask email addresses: user@example.com -> u***@example.com
    let scrubbed = obj.replace(
      /\b([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g,
      "$1***@$2"
    );
    // Mask potential JWT tokens (three dot-separated base64-like segments)
    scrubbed = scrubbed.replace(
      /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]"
    );
    return scrubbed;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubPii(item, depth + 1));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = scrubPii(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  requestId?: string
): string {
  const scrubbedContext = context ? (scrubPii(context) as Record<string, unknown>) : undefined;
  const scrubbedMessage = typeof message === "string" ? (scrubPii(message) as string) : message;

  const entry: LogEntry = {
    level,
    message: scrubbedMessage,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(scrubbedContext && { context: scrubbedContext }),
  };

  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>, requestId?: string) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(formatLog("debug", message, context, requestId));
    }
  },
  info(message: string, context?: Record<string, unknown>, requestId?: string) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.info(formatLog("info", message, context, requestId));
    }
  },
  warn(message: string, context?: Record<string, unknown>, requestId?: string) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(formatLog("warn", message, context, requestId));
    }
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>, requestId?: string) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      const errContext =
        error instanceof Error
          ? { ...context, error: { message: error.message, stack: error.stack } }
          : { ...context, error };
      console.error(formatLog("error", message, errContext, requestId));
    }
  },
};
