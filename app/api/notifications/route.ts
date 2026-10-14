import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getUserNotifications,
  markNotificationsAsRead,
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

    const { items, unreadCount } = await getUserNotifications(user.id);
    return NextResponse.json({ success: true, unreadCount, notifications: items }, { status: 200 });
  } catch (error) {
    logger.error("Error retrieving notifications", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    await markNotificationsAsRead(user.id, notificationId);
    return NextResponse.json({ success: true, message: "Marked as read." }, { status: 200 });
  } catch (error) {
    logger.error("Error updating notifications", error);
    return NextResponse.json({ error: "Failed to mark notifications as read." }, { status: 500 });
  }
}
