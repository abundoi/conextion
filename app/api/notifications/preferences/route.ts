import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/notification-service";
import { logger } from "@/lib/logging/logger";

async function getAuthUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySession(sessionCookie);
  if (!session?.uid) return null;

  return await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
    select: { id: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getOrCreateNotificationPreferences(user.id);
    return NextResponse.json({ success: true, preferences }, { status: 200 });
  } catch (error) {
    logger.error("Error retrieving notification preferences", error);
    return NextResponse.json({ error: "Failed to load preferences." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await updateNotificationPreferences(user.id, body);
    return NextResponse.json({ success: true, preferences: updated }, { status: 200 });
  } catch (error) {
    logger.error("Error updating notification preferences", error);
    return NextResponse.json({ error: "Failed to update preferences." }, { status: 500 });
  }
}
