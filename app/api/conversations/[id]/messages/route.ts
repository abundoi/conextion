import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sendMessage } from "@/lib/messaging/conversation-service";
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
      select: { id: true, accountStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (user.accountStatus !== "active") {
      return NextResponse.json({ error: "Account suspended or restricted from sending messages." }, { status: 403 });
    }

    const body = await request.json();
    const { content, clientMessageId } = body;

    const message = await sendMessage({
      actorId: user.id,
      conversationId,
      content,
      clientMessageId,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error: any) {
    logger.error("Error sending message", error);
    const status = error.message.includes("Unauthorized")
      ? 403
      : error.message.includes("blocked")
      ? 403
      : error.message.includes("Match has ended")
      ? 410
      : 400;
    return NextResponse.json({ error: error.message || "Failed to send message." }, { status });
  }
}
