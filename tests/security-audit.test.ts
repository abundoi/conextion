import { describe, it, expect } from "vitest";
import { globalRateLimiter, RATE_LIMITS } from "@/lib/security/rate-limiter";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { sanitizeText, escapeHtml } from "@/lib/security/sanitize";
import { validateImageUpload, ALLOWED_MIME_TYPES } from "@/lib/storage/gcs";
import { hasPermission, enforceRole, UnauthorizedError, AuthContext } from "@/lib/auth/rbac";
import { scrubPii } from "@/lib/logging/logger";

describe("Phase 7 — Comprehensive Security Audit Suite", () => {
  describe("1. Rate Limiting & Denial-of-Service Defense", () => {
    it("enforces sliding-window request limits and rejects over-limit bursts", () => {
      const testKey = "test-ip-rate-limit-1";
      const config = { windowMs: 1000, maxRequests: 5 };

      // Consume allowed requests
      for (let i = 0; i < 5; i++) {
        const res = globalRateLimiter.check(testKey, config);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(4 - i);
      }

      // 6th request must be rejected
      const overLimitRes = globalRateLimiter.check(testKey, config);
      expect(overLimitRes.allowed).toBe(false);
      expect(overLimitRes.remaining).toBe(0);
      expect(overLimitRes.resetAt).toBeGreaterThan(0);
    });

    it("resets rate limit window when manually cleared or after expiry", () => {
      const testKey = "test-ip-rate-limit-2";
      const config = { windowMs: 1000, maxRequests: 2 };

      globalRateLimiter.check(testKey, config);
      globalRateLimiter.check(testKey, config);
      expect(globalRateLimiter.check(testKey, config).allowed).toBe(false);

      globalRateLimiter.reset(testKey);
      expect(globalRateLimiter.check(testKey, config).allowed).toBe(true);
    });
  });

  describe("2. Cross-Site Request Forgery (CSRF) & Origin Defense", () => {
    it("allows safe HTTP read methods (GET, HEAD, OPTIONS) without origin verification", () => {
      const getCheck = validateCsrfOrigin(null, "example.com", "GET");
      expect(getCheck.isValid).toBe(true);

      const headCheck = validateCsrfOrigin("http://malicious-site.com", "example.com", "HEAD");
      expect(headCheck.isValid).toBe(true);
    });

    it("rejects mutating POST/PUT/DELETE requests from untrusted external origins", () => {
      const untrustedOrigin = "https://evil-phishing-site.com";
      const host = "conextion.app";

      const postCheck = validateCsrfOrigin(untrustedOrigin, host, "POST");
      expect(postCheck.isValid).toBe(false);
      expect(postCheck.reason).toContain("Untrusted origin");

      const deleteCheck = validateCsrfOrigin(untrustedOrigin, host, "DELETE");
      expect(deleteCheck.isValid).toBe(false);
    });

    it("accepts mutating requests when Origin matches Host header", () => {
      const origin = "https://conextion.app";
      const host = "conextion.app";

      const check = validateCsrfOrigin(origin, host, "POST");
      expect(check.isValid).toBe(true);
    });
  });

  describe("3. Cross-Site Scripting (XSS) & Input Neutralization", () => {
    it("neutralizes script tags and inline event handlers from user-supplied bio", () => {
      const maliciousBio =
        'Hello world! <script>alert("XSS")</script><img src="x" onerror="stealCookies()"/> Visit my site';
      const cleanBio = sanitizeText(maliciousBio);

      expect(cleanBio).not.toContain("<script>");
      expect(cleanBio).not.toContain("onerror");
      expect(cleanBio).not.toContain("stealCookies()");
      expect(cleanBio).toContain("Hello world!");
      expect(cleanBio).toContain("Visit my site");
    });

    it("strips dangerous javascript: URIs and iframes", () => {
      const maliciousInput = '<iframe src="javascript:alert(1)"></iframe>Click <a href="javascript:doEvil()">here</a>';
      const clean = sanitizeText(maliciousInput);

      expect(clean).not.toContain("<iframe");
      expect(clean).not.toContain("javascript:");
    });

    it("escapes raw angle brackets and special characters for HTML attribute context", () => {
      const raw = '<div class="test">&\'"</div>';
      const escaped = escapeHtml(raw);

      expect(escaped).toBe("&lt;div class=&quot;test&quot;&gt;&amp;&#039;&quot;&lt;/div&gt;");
    });
  });

  describe("4. File Upload Security & MIME Enforcement", () => {
    it("strictly rejects SVG files to prevent stored SVG-based XSS attacks", () => {
      const svgValidation = validateImageUpload("image/svg+xml", 1024);
      expect(svgValidation.isValid).toBe(false);
      expect(svgValidation.error).toContain("Only JPEG, PNG, and WebP");
    });

    it("rejects binary executables, shell scripts, and unknown MIME types", () => {
      const exeValidation = validateImageUpload("application/x-msdownload", 5000);
      expect(exeValidation.isValid).toBe(false);

      const htmlValidation = validateImageUpload("text/html", 2000);
      expect(htmlValidation.isValid).toBe(false);
    });

    it("rejects empty files and files exceeding 10MB limit", () => {
      const emptyValidation = validateImageUpload("image/jpeg", 0);
      expect(emptyValidation.isValid).toBe(false);
      expect(emptyValidation.error).toContain("empty");

      const oversizeValidation = validateImageUpload("image/png", 11 * 1024 * 1024);
      expect(oversizeValidation.isValid).toBe(false);
      expect(oversizeValidation.error).toContain("exceeds the 10MB maximum limit");
    });

    it("accepts valid JPEG, PNG, and WebP payloads within size thresholds", () => {
      for (const mime of ALLOWED_MIME_TYPES) {
        const validRes = validateImageUpload(mime, 2 * 1024 * 1024);
        expect(validRes.isValid).toBe(true);
      }
    });
  });

  describe("5. Broken Access Control & Privilege Escalation Defense", () => {
    const regularMemberContext: AuthContext = {
      userId: "member-alice",
      firebaseUid: "fb-alice",
      email: "alice@example.com",
      role: "member",
      accountStatus: "active",
    };

    it("prevents standard members from executing moderation actions (vertical escalation)", () => {
      expect(hasPermission(regularMemberContext.role, "moderation:review_photos")).toBe(false);
      expect(hasPermission(regularMemberContext.role, "moderation:review_reports")).toBe(false);
      expect(() => enforceRole(regularMemberContext, ["moderator", "safety_admin"])).toThrow(
        UnauthorizedError
      );
    });

    it("prevents moderators from executing super-admin actions like policy publishing or system reconfig", () => {
      const moderatorContext: AuthContext = {
        userId: "mod-bob",
        firebaseUid: "fb-bob",
        email: "bob@example.com",
        role: "moderator",
        accountStatus: "active",
      };

      expect(hasPermission(moderatorContext.role, "admin:system_config")).toBe(false);
      expect(hasPermission(moderatorContext.role, "admin:manage_roles")).toBe(false);
      expect(() => enforceRole(moderatorContext, ["super_admin"])).toThrow(UnauthorizedError);
    });
  });

  describe("6. PII Masking & Data Leakage Prevention in Structured Logs", () => {
    it("scrubs cleartext email addresses from log messages and nested contexts", () => {
      const rawMessage = "User test.account+dating@subdomain.example.com initiated login.";
      const scrubbed = scrubPii(rawMessage);
      expect(scrubbed).not.toContain("test.account+dating@subdomain.example.com");
      expect(scrubbed).toContain("t***@subdomain.example.com");
    });

    it("redacts sensitive authentication tokens, session cookies, and passwords", () => {
      const logContext = {
        userId: "usr-123",
        password: "SuperSecretPassword123!",
        __session: "secret_cookie_payload",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature",
        ip: "192.168.1.1",
        meta: {
          authorization: "Bearer secret-bearer-token",
          safeField: "active",
        },
      };

      const sanitized = scrubPii(logContext) as Record<string, any>;
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.__session).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.meta.authorization).toBe("[REDACTED]");
      expect(sanitized.meta.safeField).toBe("active");
    });
  });
});
