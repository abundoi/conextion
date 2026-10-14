import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { unmatchUsers } from "@/lib/matching/interactions";
import { MatchStatus } from "@prisma/client";
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
        status: MatchStatus.active,
      },
      include: {
        user1: {
          include: {
            profile: true,
            photos: { where: { isPrimary: true } },
          },
        },
        user2: {
          include: {
            profile: true,
            photos: { where: { isPrimary: true } },
          },
        },
      },
      orderBy: { matchedAt: "desc" },
    });

    const formattedMatches = matches.map((m) => {
      const partner = m.user1Id === user.id ? m.user2 : m.user1;
      return {
        matchId: m.id,
        matchedAt: m.matchedAt,
        partner: {
          id: partner.id,
          displayName: partner.profile?.displayName ?? "Member",
          computedAge: partner.profile?.computedAge,
          locationCity: partner.profile?.locationCity,
          locationCountry: partner.profile?.locationCountry,
          relationshipIntent: partner.profile?.relationshipIntent,
          photoUrl: partner.photos[0]?.publicUrl ?? null,
        },
      };
    });

    return NextResponse.json({ success: true, count: formattedMatches.length, matches: formattedMatches }, { status: 200 });
  } catch (error) {
    logger.error("Error retrieving matches", error);
    return NextResponse.json({ error: "Failed to load matches." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId parameter." }, { status: 400 });
    }

    await unmatchUsers(user.id, matchId);

    return NextResponse.json({ success: true, message: "Unmatched successfully." }, { status: 200 });
  } catch (error: any) {
    logger.error("Error unmatching users", error);
    return NextResponse.json({ error: error.message || "Failed to unmatch." }, { status: 400 });
  }
}
