import { prisma } from "../db/prisma";
import { InteractionType, MatchStatus, ReportCategory } from "@prisma/client";
import { logger } from "../logging/logger";

export interface RecordInteractionResult {
  isMatch: boolean;
  matchId?: string;
  matchedAt?: Date;
  interaction: {
    id: string;
    actorId: string;
    targetId: string;
    type: InteractionType;
    comment?: string | null;
  };
}

/**
 * Normalizes two user IDs into a deterministic pair (lexicographically sorted).
 * Guarantees that (A, B) and (B, A) map to the exact same database row in `matches`.
 */
export function normalizeMatchPair(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}

/**
 * Records an interaction (like, pass, or compliment) atomically.
 * If mutual like is detected, creates or reactivates a match in a single ACID transaction.
 */
export async function recordInteraction(
  actorId: string,
  targetId: string,
  type: InteractionType,
  comment?: string
): Promise<RecordInteractionResult> {
  if (actorId === targetId) {
    throw new Error("Self-interaction is prohibited.");
  }

  // Verify neither user has blocked the other
  const blockExists = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: actorId, blockedId: targetId },
        { blockerId: targetId, blockedId: actorId },
      ],
    },
  });

  if (blockExists) {
    throw new Error("Unable to interact: A safety boundary exists between these members.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Record or update the interaction (duplicate-action prevention via upsert)
    const interaction = await tx.interaction.upsert({
      where: {
        actorId_targetId: { actorId, targetId },
      },
      update: {
        type,
        comment: comment ?? null,
      },
      create: {
        actorId,
        targetId,
        type,
        comment: comment ?? null,
      },
    });

    // If it's a pass, no match can occur
    if (type === "pass") {
      return {
        isMatch: false,
        interaction,
      };
    }

    // 2. Check for reciprocal like or compliment from target
    const reverseInteraction = await tx.interaction.findUnique({
      where: {
        actorId_targetId: { actorId: targetId, targetId: actorId },
      },
    });

    const isReciprocal =
      reverseInteraction &&
      (reverseInteraction.type === "like" || reverseInteraction.type === "compliment");

    if (!isReciprocal) {
      return {
        isMatch: false,
        interaction,
      };
    }

    // 3. Atomically create or reactivate mutual match
    const [user1Id, user2Id] = normalizeMatchPair(actorId, targetId);

    const match = await tx.match.upsert({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
      },
      update: {
        status: MatchStatus.active,
        matchedAt: new Date(),
        unmatchedAt: null,
        unmatchedById: null,
      },
      create: {
        user1Id,
        user2Id,
        status: MatchStatus.active,
      },
    });

    logger.info("Mutual match successfully generated", {
      actorId,
      targetId,
      matchId: match.id,
    });

    return {
      isMatch: true,
      matchId: match.id,
      matchedAt: match.matchedAt,
      interaction,
    };
  });
}

/**
 * Unmatches two users.
 */
export async function unmatchUsers(actorId: string, matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error("Match not found.");
  }

  if (match.user1Id !== actorId && match.user2Id !== actorId) {
    throw new Error("Unauthorized: You are not a party to this match.");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.unmatched,
      unmatchedAt: new Date(),
      unmatchedById: actorId,
    },
  });

  logger.info("Match revoked by member", { actorId, matchId });
}

/**
 * Blocks another user bidirectionally and terminates any active match.
 */
export async function blockMember(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error("Cannot block yourself.");
  }

  const [user1Id, user2Id] = normalizeMatchPair(blockerId, blockedId);

  await prisma.$transaction(async (tx) => {
    // 1. Create block record
    await tx.block.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      update: { reason },
      create: { blockerId, blockedId, reason },
    });

    // 2. Terminate any active match
    await tx.match.updateMany({
      where: {
        user1Id,
        user2Id,
        status: MatchStatus.active,
      },
      data: {
        status: MatchStatus.unmatched,
        unmatchedAt: new Date(),
        unmatchedById: blockerId,
      },
    });

    // 3. Log safety audit
    await tx.auditLog.create({
      data: {
        actorId: blockerId,
        action: "user:blocked",
        targetEntity: "users",
        targetId: blockedId,
        details: { reason },
      },
    });
  });

  logger.info("Member blocked successfully", { blockerId, blockedId });
}

/**
 * Submits a safety report for moderation review.
 */
export async function reportMember(
  reporterId: string,
  reportedId: string,
  category: ReportCategory,
  details?: string
): Promise<string> {
  if (reporterId === reportedId) {
    throw new Error("Cannot report yourself.");
  }

  const report = await prisma.$transaction(async (tx) => {
    const r = await tx.report.create({
      data: {
        reporterId,
        reportedId,
        category,
        details,
        status: "pending",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: reporterId,
        action: "user:reported",
        targetEntity: "reports",
        targetId: r.id,
        details: { reportedId, category },
      },
    });

    return r;
  });

  logger.info("Safety report queued for moderation", {
    reportId: report.id,
    reporterId,
    reportedId,
    category,
  });

  return report.id;
}
