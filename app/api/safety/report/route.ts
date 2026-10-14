import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { reportMember } from "@/lib/matching/interactions";
import { ReportCategory } from "@prisma/client";
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
    const { reportedId, category, details } = body;

    if (!reportedId || typeof reportedId !== "string") {
      return NextResponse.json({ error: "Missing reportedId." }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Missing report category." }, { status: 400 });
    }

    const reportId = await reportMember(
      user.id,
      reportedId,
      category as ReportCategory,
      details
    );

    return NextResponse.json(
      { success: true, message: "Safety report received and queued for review.", reportId },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("Error in /api/safety/report", error);
    return NextResponse.json({ error: error.message || "Failed to submit report." }, { status: 400 });
  }
}
