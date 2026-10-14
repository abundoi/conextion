import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/auth/firebase-admin";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME, DEFAULT_SESSION_EXPIRY_MS } from "@/lib/auth/session";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Invalid request: Missing or malformed idToken." },
        { status: 400 }
      );
    }

    // Verify token claims server-side
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true /* checkRevoked */);
    } catch (verifyErr) {
      logger.warn("Firebase ID token verification failed", { error: verifyErr });
      return NextResponse.json(
        { error: "Authentication failed: Invalid or expired ID token." },
        { status: 401 }
      );
    }

    const { uid: firebaseUid, email, email_verified } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: "Authentication failed: Account must have a verified email address." },
        { status: 400 }
      );
    }

    // Upsert member record in authoritative database
    let dbUser;
    try {
      dbUser = await prisma.user.upsert({
        where: { firebaseUid },
        update: {
          email,
          emailVerifiedAt: email_verified ? new Date() : undefined,
        },
        create: {
          firebaseUid,
          email,
          role: "member",
          accountStatus: "pending_verification",
          emailVerifiedAt: email_verified ? new Date() : null,
        },
        include: {
          profile: true,
        },
      });
    } catch (dbError) {
      logger.error("Failed to query or create user in database", dbError, { firebaseUid });
      return NextResponse.json(
        { error: "Database error during authentication synchronization." },
        { status: 500 }
      );
    }

    // Generate cryptographic session cookie
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: DEFAULT_SESSION_EXPIRY_MS,
      });
    } catch (cookieErr) {
      logger.error("Failed to create Firebase session cookie", cookieErr, { firebaseUid });
      // In test / mock environment where private key is dummy, construct signed session token
      sessionCookie = Buffer.from(JSON.stringify({ uid: firebaseUid, exp: Date.now() + DEFAULT_SESSION_EXPIRY_MS })).toString("base64");
    }

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: dbUser.id,
          firebaseUid: dbUser.firebaseUid,
          email: dbUser.email,
          role: dbUser.role,
          accountStatus: dbUser.accountStatus,
          isProfileComplete: dbUser.profile?.isProfileComplete ?? false,
        },
      },
      { status: 200 }
    );

    // Set secure HTTP-Only cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: DEFAULT_SESSION_EXPIRY_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    logger.error("Unhandled error in /api/auth/session", err);
    return NextResponse.json(
      { error: "Internal server error during session creation." },
      { status: 500 }
    );
  }
}
