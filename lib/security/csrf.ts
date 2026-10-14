/**
 * Conextion - CSRF & Origin Validation Utility
 * Enforces cross-origin request protections for state-changing HTTP methods.
 */

export interface CsrfValidationResult {
  isValid: boolean;
  reason?: string;
}

const ALLOWED_ORIGINS: string[] = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
];

if (process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.push(`https://${process.env.VERCEL_URL}`);
}

/**
 * Validates request origin against allowed origin domain whitelist.
 */
export function validateCsrfOrigin(
  originHeader: string | null | undefined,
  hostHeader: string | null | undefined,
  method: string
): CsrfValidationResult {
  // Safe HTTP read methods are exempt from CSRF origin checks
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(method.toUpperCase())) {
    return { isValid: true };
  }

  // If no origin header is provided, inspect host header (some same-origin requests omit origin)
  if (!originHeader) {
    if (hostHeader) {
      return { isValid: true };
    }
    return {
      isValid: false,
      reason: "Missing Origin or Host header on mutating request.",
    };
  }

  // Clean origin
  try {
    const originUrl = new URL(originHeader);
    const originHost = originUrl.host;

    if (hostHeader && originHost.toLowerCase() === hostHeader.toLowerCase()) {
      return { isValid: true };
    }

    const isExplicitlyAllowed = ALLOWED_ORIGINS.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return allowedUrl.host.toLowerCase() === originHost.toLowerCase();
      } catch {
        return false;
      }
    });

    if (isExplicitlyAllowed) {
      return { isValid: true };
    }

    return {
      isValid: false,
      reason: `Untrusted origin '${originHeader}' rejected.`,
    };
  } catch (error) {
    return {
      isValid: false,
      reason: "Malformed Origin header.",
    };
  }
}
