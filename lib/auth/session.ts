import { adminAuth } from "./firebase-admin";
import { logger } from "../logging/logger";

export const SESSION_COOKIE_NAME = "__session";
export const DEFAULT_SESSION_EXPIRY_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

export interface VerifiedSession {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  role?: string;
  authTime: number;
  exp: number;
}

export async function createSession(idToken: string, expiresInMs = DEFAULT_SESSION_EXPIRY_MS): Promise<string> {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });
    return sessionCookie;
  } catch (error) {
    logger.error("Failed to generate session cookie from Firebase ID token", error);
    throw new Error("Authentication failed: Unable to create session.");
  }
}

export async function verifySession(sessionCookie: string): Promise<VerifiedSession | null> {
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      role: decoded.role as string | undefined,
      authTime: decoded.auth_time,
      exp: decoded.exp,
    };
  } catch (error) {
    logger.warn("Session verification failed or token revoked", { error });
    return null;
  }
}

export async function invalidateSession(firebaseUid: string): Promise<void> {
  try {
    await adminAuth.revokeRefreshTokens(firebaseUid);
    logger.info("Revoked all sessions and refresh tokens for user", { firebaseUid });
  } catch (error) {
    logger.error("Failed to invalidate session for user", error, { firebaseUid });
    throw new Error("Unable to invalidate user session.");
  }
}
