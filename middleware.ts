import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { globalRateLimiter, RATE_LIMITS, type RateLimitConfig } from "@/lib/security/rate-limiter";
import { validateCsrfOrigin } from "@/lib/security/csrf";

const PROTECTED_PREFIXES = ["/discovery", "/profile", "/settings", "/messages", "/matches", "/admin"];

// Webhooks verify signatures instead of browser CSRF origin
const CSRF_EXEMPT_PATHS = ["/api/subscriptions/webhook"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("__session")?.value;

  // 1. Authentication Gate for protected UI paths
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. CSRF Origin Verification on mutating API requests (POST, PUT, PATCH, DELETE)
  if (pathname.startsWith("/api") && !CSRF_EXEMPT_PATHS.includes(pathname)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const csrfCheck = validateCsrfOrigin(origin, host, request.method);
    if (!csrfCheck.isValid) {
      return NextResponse.json(
        { error: "Forbidden: Cross-site request rejected.", reason: csrfCheck.reason },
        { status: 403 }
      );
    }
  }

  // 3. Sliding-Window Rate Limiting on API requests
  if (pathname.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    let config: RateLimitConfig = RATE_LIMITS.standard;
    if (pathname.startsWith("/api/auth")) config = RATE_LIMITS.auth;
    else if (pathname.startsWith("/api/discovery")) config = RATE_LIMITS.discovery;
    else if (pathname.startsWith("/api/interactions")) config = RATE_LIMITS.interactions;
    else if (pathname.startsWith("/api/conversations")) config = RATE_LIMITS.messages;
    else if (pathname.startsWith("/api/media")) config = RATE_LIMITS.uploads;
    else if (pathname.startsWith("/api/safety") || pathname.startsWith("/api/moderation")) config = RATE_LIMITS.reports;
    else if (pathname.startsWith("/api/health")) config = RATE_LIMITS.health;

    const rateKey = `${ip}:${pathname.split("/")[2] || "root"}`;
    const rateCheck = globalRateLimiter.check(rateKey, config);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too Many Requests. Rate limit exceeded, please retry later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, rateCheck.resetAt - Math.ceil(Date.now() / 1000))),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateCheck.resetAt),
          },
        }
      );
    }
  }

  // 4. Attach Security Headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://storage.googleapis.com https://firebasestorage.googleapis.com; font-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com; frame-ancestors 'none';"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
