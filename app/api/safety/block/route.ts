import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { blockMember } from "@/lib/matching/interactions";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const session = await verifySession(sessionCookie);
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized: Invalid session." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: session.uid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const body = await request.json();
    const { blockedId, reason } = body;

    if (!blockedId || typeof blockedId !== "string") {
      return NextResponse.json({ error: "Missing blockedId." }, { status: 400 });
    }

    await blockMember(user.id, blockedId, reason);

    return NextResponse.json({ success: true, message: "Member blocked and all connections removed." }, { status: 200 });
  } catch (error: any) {
    logger.error("Error in /api/safety/block", error);
    return NextResponse.json({ error: error.message || "Failed to block member." }, { status: 400 });
  }
}
