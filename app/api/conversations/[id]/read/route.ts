import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { markConversationRead } from "@/lib/messaging/conversation-service";
import { logger } from "@/lib/logging/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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

    const count = await markConversationRead(conversationId, user.id);
    return NextResponse.json({ success: true, readCount: count }, { status: 200 });
  } catch (error: any) {
    logger.error("Error marking messages as read", error);
    return NextResponse.json({ error: error.message || "Failed to mark as read." }, { status: 500 });
  }
}
