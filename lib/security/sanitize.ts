/**
 * Conextion - Input Sanitization & XSS Neutralization
 * Strips executable HTML tags, javascript: URIs, and dangerous attributes.
 */

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, // onerror=, onclick=, onload=
  /javascript:[^'"]*/gi,
  /data:\s*text\/html[^'"]*/gi,
];

/**
 * Strips script tags, event handlers, and malicious HTML from free-text strings.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";

  let sanitized = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Escape raw angle brackets to neutralize dangling markup
  sanitized = sanitized
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return sanitized.trim();
}

/**
 * Escapes characters for safe inclusion in JSON/HTML attributes.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
