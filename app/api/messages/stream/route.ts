import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { chatEventBus, ChatMessageEvent } from "@/lib/messaging/event-bus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = await verifySession(sessionCookie);
  if (!session?.uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
    select: { id: true },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return new Response("Missing conversationId", { status: 400 });
  }

  // Verify user is authorized party in this conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  if (conversation.match.user1Id !== user.id && conversation.match.user2Id !== user.id) {
    return new Response("Forbidden: Not a party to this conversation", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", conversationId })}\n\n`)
      );

      // Listener for incoming messages
      const onMessage = (event: ChatMessageEvent) => {
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
        );
      };

      // Listener for read receipts
      const onRead = (event: any) => {
        controller.enqueue(
          encoder.encode(`event: read\ndata: ${JSON.stringify(event)}\n\n`)
        );
      };

      // Listener for typing
      const onTyping = (event: any) => {
        controller.enqueue(
          encoder.encode(`event: typing\ndata: ${JSON.stringify(event)}\n\n`)
        );
      };

      const messageChannel = `conversation:${conversationId}:message`;
      const readChannel = `conversation:${conversationId}:read`;
      const typingChannel = `conversation:${conversationId}:typing`;

      chatEventBus.on(messageChannel, onMessage);
      chatEventBus.on(readChannel, onRead);
      chatEventBus.on(typingChannel, onTyping);

      // Keepalive interval every 15s to maintain serverless stream
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        chatEventBus.off(messageChannel, onMessage);
        chatEventBus.off(readChannel, onRead);
        chatEventBus.off(typingChannel, onTyping);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
