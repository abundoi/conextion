import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getDiscoveryFeed } from "@/lib/matching/discovery";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Account onboarding incomplete or status restricted." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const minAge = searchParams.get("minAge") ? parseInt(searchParams.get("minAge")!, 10) : undefined;
    const maxAge = searchParams.get("maxAge") ? parseInt(searchParams.get("maxAge")!, 10) : undefined;
    const relationshipIntent = searchParams.get("intent") || undefined;

    const candidates = await getDiscoveryFeed(user.id, {
      minAge,
      maxAge,
      relationshipIntent,
    });

    return NextResponse.json({ success: true, count: candidates.length, candidates }, { status: 200 });
  } catch (error) {
    logger.error("Error in /api/discovery", error);
    return NextResponse.json({ error: "Failed to load discovery feed." }, { status: 500 });
  }
}
