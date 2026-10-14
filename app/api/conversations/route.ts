import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getUserConversations,
  getOrCreateConversation,
} from "@/lib/messaging/conversation-service";
import { logger } from "@/lib/logging/logger";

async function getAuthUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySession(sessionCookie);
  if (!session?.uid) return null;

  return await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
    select: { id: true, accountStatus: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    if (user.accountStatus !== "active") {
      return NextResponse.json({ error: "Account access restricted." }, { status: 403 });
    }

    const conversations = await getUserConversations(user.id);
    return NextResponse.json({ success: true, count: conversations.length, conversations }, { status: 200 });
  } catch (error) {
    logger.error("Error retrieving conversations", error);
    return NextResponse.json({ error: "Failed to load conversations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { matchId } = body;

    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "Missing matchId parameter." }, { status: 400 });
    }

    const conversation = await getOrCreateConversation(matchId, user.id);
    return NextResponse.json({ success: true, conversationId: conversation.id }, { status: 201 });
  } catch (error: any) {
    logger.error("Error creating/retrieving conversation", error);
    return NextResponse.json({ error: error.message || "Failed to initialize conversation." }, { status: 400 });
  }
}
