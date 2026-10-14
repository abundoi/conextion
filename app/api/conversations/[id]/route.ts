import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getConversationMessages,
  markConversationRead,
} from "@/lib/messaging/conversation-service";
import { logger } from "@/lib/logging/logger";

export async function GET(
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
      select: { id: true, accountStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.accountStatus !== "active") {
      return NextResponse.json({ error: "Account access restricted." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const beforeStr = searchParams.get("before");
    const beforeTimestamp = beforeStr ? new Date(beforeStr) : undefined;

    const details = await getConversationMessages(
      conversationId,
      user.id,
      limit,
      beforeTimestamp
    );

    // Auto mark received messages as read
    await markConversationRead(conversationId, user.id);

    return NextResponse.json({ success: true, ...details }, { status: 200 });
  } catch (error: any) {
    logger.error("Error retrieving conversation thread", error);
    const status = error.message.includes("Unauthorized")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 500;
    return NextResponse.json({ error: error.message || "Failed to load conversation." }, { status });
  }
}
