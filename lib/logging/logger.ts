type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  ip?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(formatLog("debug", message, context));
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.info(formatLog("info", message, context));
    }
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(formatLog("warn", message, context));
    }
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      const errContext =
        error instanceof Error
          ? { ...context, error: { message: error.message, stack: error.stack } }
          : { ...context, error };
      console.error(formatLog("error", message, errContext));
    }
  },
};
