import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordInteraction } from "@/lib/matching/interactions";
import { InteractionType } from "@prisma/client";
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
      select: { id: true, accountStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (user.accountStatus !== "active") {
      return NextResponse.json({ error: "Account inactive or restricted." }, { status: 403 });
    }

    const body = await request.json();
    const { targetId, type, comment } = body;

    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json({ error: "Missing targetId." }, { status: 400 });
    }

    if (!type || !["like", "pass", "compliment"].includes(type)) {
      return NextResponse.json({ error: "Invalid interaction type." }, { status: 400 });
    }

    const result = await recordInteraction(
      user.id,
      targetId,
      type as InteractionType,
      comment
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    logger.error("Error recording member interaction", error);
    return NextResponse.json({ error: error.message || "Failed to record interaction." }, { status: 400 });
  }
}
