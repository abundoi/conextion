import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await verifySession(sessionCookie);
    if (!session?.uid) {
      return NextResponse.json({ authenticated: false, error: "Invalid or expired session" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: session.uid },
      include: {
        profile: true,
        preferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, error: "Member record not found" }, { status: 404 });
    }

    if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
      return NextResponse.json(
        { authenticated: false, error: `Account access restricted: ${user.accountStatus}` },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          profile: user.profile,
          preferences: user.preferences,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error verifying authentication session", error);
    return NextResponse.json({ authenticated: false, error: "Internal verification error" }, { status: 500 });
  }
}
