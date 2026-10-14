import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { saveProfile, savePreferences, setDiscoveryVisibility } from "@/lib/profile/profile-service";
import { logger } from "@/lib/logging/logger";

async function getAuthUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySession(sessionCookie);
  if (!session?.uid) return null;

  return await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    const fullProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        preferences: true,
        photos: {
          orderBy: { displayOrder: "asc" },
        },
        interests: {
          include: { interest: true },
        },
        prompts: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, user: fullProfile }, { status: 200 });
  } catch (error) {
    logger.error("Error fetching user profile", error);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const { profile, preferences } = body;

    if (profile) {
      await saveProfile(user.id, profile);
    }

    if (preferences) {
      await savePreferences(user.id, preferences);
    }

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true, preferences: true },
    });

    return NextResponse.json({ success: true, user: updated }, { status: 200 });
  } catch (error: any) {
    logger.error("Error updating profile", error);
    return NextResponse.json({ error: error.message || "Failed to update profile." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const { isVisible } = body;

    if (typeof isVisible !== "boolean") {
      return NextResponse.json({ error: "Invalid isVisible parameter." }, { status: 400 });
    }

    const updated = await setDiscoveryVisibility(user.id, isVisible);
    return NextResponse.json({ success: true, isVisible: updated.isVisible }, { status: 200 });
  } catch (error) {
    logger.error("Error toggling discovery visibility", error);
    return NextResponse.json({ error: "Failed to update visibility." }, { status: 500 });
  }
}
