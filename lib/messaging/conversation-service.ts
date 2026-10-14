import { prisma } from "../db/prisma";
import { MessageStatus, MatchStatus } from "@prisma/client";
import { chatEventBus } from "./event-bus";
import { createNotification } from "../notifications/notification-service";
import { logger } from "../logging/logger";

export interface SendMessageParams {
  actorId: string;
  conversationId: string;
  content: string;
  clientMessageId?: string;
}

/**
 * Ensures or creates a persistent conversation for a verified active match.
 */
export async function getOrCreateConversation(matchId: string, actorId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error("Match not found.");
  }

  if (match.user1Id !== actorId && match.user2Id !== actorId) {
    throw new Error("Unauthorized: You are not a party to this match.");
  }

  if (match.status !== MatchStatus.active) {
    throw new Error("Conversation unavailable: Match is no longer active.");
  }

  return await prisma.conversation.upsert({
    where: { matchId },
    update: {},
    create: { matchId },
    include: {
      match: {
        include: {
          user1: { include: { profile: true, photos: { where: { isPrimary: true } } } },
          user2: { include: { profile: true, photos: { where: { isPrimary: true } } } },
        },
      },
    },
  });
}

/**
 * Retrieves all conversations for the authenticated member with partner details and unread counts.
 */
export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      match: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: MatchStatus.active,
      },
    },
    include: {
      match: {
        include: {
          user1: { include: { profile: true, photos: { where: { isPrimary: true } } } },
          user2: { include: { profile: true, photos: { where: { isPrimary: true } } } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  // Calculate unread count for each conversation
  const formatted = await Promise.all(
    conversations.map(async (conv) => {
      const partner = conv.match.user1Id === userId ? conv.match.user2 : conv.match.user1;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: partner.id,
          status: { not: MessageStatus.read },
        },
      });

      return {
        id: conv.id,
        matchId: conv.matchId,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        lastMessage: conv.messages[0]
          ? {
              id: conv.messages[0].id,
              content: conv.messages[0].content,
              senderId: conv.messages[0].senderId,
              createdAt: conv.messages[0].createdAt,
              status: conv.messages[0].status,
            }
          : null,
        partner: {
          id: partner.id,
          displayName: partner.profile?.displayName ?? "Member",
          computedAge: partner.profile?.computedAge,
          locationCity: partner.profile?.locationCity,
          relationshipIntent: partner.profile?.relationshipIntent,
          photoUrl: partner.photos[0]?.publicUrl ?? null,
        },
      };
    })
  );

  return formatted;
}

/**
 * Retrieves paginated messages for a conversation after enforcing participant authorization.
 */
export async function getConversationMessages(
  conversationId: string,
  actorId: string,
  limit = 50,
  beforeTimestamp?: Date
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        include: {
          user1: { include: { profile: true, photos: { where: { isPrimary: true } } } },
          user2: { include: { profile: true, photos: { where: { isPrimary: true } } } },
        },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const { match } = conversation;
  if (match.user1Id !== actorId && match.user2Id !== actorId) {
    throw new Error("Unauthorized: Access to this conversation is denied.");
  }

  const partner = match.user1Id === actorId ? match.user2 : match.user1;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(beforeTimestamp ? { createdAt: { lt: beforeTimestamp } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return {
    conversationId,
    matchId: match.id,
    matchStatus: match.status,
    partner: {
      id: partner.id,
      displayName: partner.profile?.displayName ?? "Member",
      computedAge: partner.profile?.computedAge,
      locationCity: partner.profile?.locationCity,
      relationshipIntent: partner.profile?.relationshipIntent,
      photoUrl: partner.photos[0]?.publicUrl ?? null,
    },
    messages,
  };
}

/**
 * Sends a message with safety checks and duplicate prevention.
 */
export async function sendMessage(params: SendMessageParams) {
  const { actorId, conversationId, content, clientMessageId } = params;

  // 1. Validate payload length
  const trimmed = content?.trim();
  if (!trimmed) {
    throw new Error("Message content cannot be empty.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Message exceeds the maximum limit of 2,000 characters.");
  }

  // 2. Fetch conversation and verify authorization & active status
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true },
  });

  if (!conversation) {
    throw new Error("Conversation does not exist.");
  }

  const { match } = conversation;

  // Check sender is participant
  if (match.user1Id !== actorId && match.user2Id !== actorId) {
    throw new Error("Unauthorized: You are not a participant in this conversation.");
  }

  // Check match is active
  if (match.status !== MatchStatus.active) {
    throw new Error("Cannot send message: Match has ended.");
  }

  const recipientId = match.user1Id === actorId ? match.user2Id : match.user1Id;

  // 3. Safety check: Verify neither user has blocked the other
  const blockExists = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: actorId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: actorId },
      ],
    },
  });

  if (blockExists) {
    throw new Error("Message blocked: A safety restriction exists between participants.");
  }

  // 4. Duplicate prevention via clientMessageId idempotency
  if (clientMessageId) {
    const existing = await prisma.message.findUnique({
      where: { clientMessageId },
    });
    if (existing) {
      logger.info("Duplicate message prevented via idempotency key", {
        clientMessageId,
        messageId: existing.id,
      });
      return existing;
    }
  }

  // 5. Persist message and update conversation in transaction
  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        senderId: actorId,
        content: trimmed,
        clientMessageId,
        status: MessageStatus.sent,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt },
    });

    return msg;
  });

  // 6. Broadcast real-time message event via event bus
  chatEventBus.broadcastMessage({
    conversationId,
    messageId: message.id,
    senderId: actorId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
  });

  // 7. Event-driven in-app notification (sanitized preview)
  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New Message",
    preview: "You have received a new message from a connection.",
    link: `/messages/${conversationId}`,
  });

  return message;
}

/**
 * Marks messages as read and broadcasts read receipt.
 */
export async function markConversationRead(conversationId: string, readerId: string) {
  const readAt = new Date();

  const updateResult = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: readerId },
      status: { not: MessageStatus.read },
    },
    data: {
      status: MessageStatus.read,
      readAt,
    },
  });

  if (updateResult.count > 0) {
    chatEventBus.broadcastReadReceipt(conversationId, readerId, readAt.toISOString());
  }

  return updateResult.count;
}
