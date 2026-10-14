import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession, invalidateSession } from "@/lib/auth/session";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionCookie) {
      const session = await verifySession(sessionCookie);
      if (session?.uid) {
        try {
          await invalidateSession(session.uid);
        } catch (revokeErr) {
          logger.warn("Could not revoke session on signout", { error: revokeErr });
        }
      }
    }

    const response = NextResponse.json({ success: true, message: "Signed out successfully." }, { status: 200 });

    // Clear session cookie
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    logger.error("Error in /api/auth/signout", error);
    return NextResponse.json({ error: "Failed to sign out properly." }, { status: 500 });
  }
}
