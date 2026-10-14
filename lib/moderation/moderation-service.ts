import { prisma } from "../db/prisma";
import {
  ReportCategory,
  CasePriority,
  ReportStatus,
  AppealStatus,
  AccountStatus,
} from "@prisma/client";
import { AuthContext, enforceRole } from "../auth/rbac";
import { logger } from "../logging/logger";

export interface CreateCaseParams {
  reporterId: string;
  reportedId: string;
  category: ReportCategory;
  details?: string;
  evidence?: Record<string, unknown>;
}

export interface ResolveCaseParams {
  caseId: string;
  actor: AuthContext;
  resolution: string;
  actionTaken: "dismiss" | "warning" | "reject_content" | "suspend" | "ban";
}

/**
 * Maps a report category to an initial SLA triage priority.
 */
export function determineCasePriority(category: ReportCategory): CasePriority {
  switch (category) {
    case "underage_suspicion":
    case "safety_concern":
      return "critical";
    case "inappropriate_content":
      return "high";
    case "harassment":
    case "spam_or_scam":
      return "medium";
    case "impersonation":
    default:
      return "low";
  }
}

/**
 * Creates a persistent moderation case from a member report.
 */
export async function createModerationCase(params: CreateCaseParams) {
  const priority = determineCasePriority(params.category);

  return await prisma.$transaction(async (tx) => {
    // 1. If underage suspicion, proactively pause discovery pending human review
    if (params.category === "underage_suspicion") {
      await tx.userProfile.updateMany({
        where: { userId: params.reportedId },
        data: { isVisible: false },
      });
    }

    // 2. Create the moderation case
    const modCase = await tx.moderationCase.create({
      data: {
        reporterId: params.reporterId,
        reportedId: params.reportedId,
        category: params.category,
        priority,
        status: "pending",
        details: params.details,
        evidence: (params.evidence as any) ?? null,
      },
    });

    // 3. Immutable audit record
    await tx.auditLog.create({
      data: {
        actorId: params.reporterId,
        action: "moderation_case:created",
        targetEntity: "moderation_cases",
        targetId: modCase.id,
        details: { reportedId: params.reportedId, category: params.category, priority },
      },
    });

    logger.info("Moderation case initialized", {
      caseId: modCase.id,
      reportedId: params.reportedId,
      priority,
    });

    return modCase;
  });
}

/**
 * Retrieves moderation queue cases enforcing role access.
 */
export async function getModerationCases(
  actor: AuthContext,
  filters?: { status?: ReportStatus; priority?: CasePriority; assignedToId?: string }
) {
  // Enforce staff permission
  enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);

  return await prisma.moderationCase.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
      ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    },
    include: {
      reporter: { select: { id: true, email: true, role: true } },
      reported: {
        select: {
          id: true,
          email: true,
          accountStatus: true,
          profile: true,
          photos: true,
        },
      },
      assignedTo: { select: { id: true, email: true, role: true } },
      notes: {
        include: { author: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      appeals: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Adds an internal case note accessible strictly to staff.
 */
export async function addCaseNote(actor: AuthContext, caseId: string, note: string) {
  enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);

  const cleanNote = note.trim();
  if (!cleanNote) throw new Error("Note cannot be empty.");

  return await prisma.caseNote.create({
    data: {
      caseId,
      authorId: actor.userId,
      note: cleanNote,
    },
    include: {
      author: { select: { id: true, email: true, role: true } },
    },
  });
}

/**
 * Resolves a moderation case and executes human-directed enforcement.
 */
export async function resolveModerationCase(params: ResolveCaseParams) {
  const { caseId, actor, resolution, actionTaken } = params;
  enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);

  const modCase = await prisma.moderationCase.findUnique({
    where: { id: caseId },
  });

  if (!modCase) throw new Error("Moderation case not found.");

  // Safety admins required for bans or suspensions
  if ((actionTaken === "ban" || actionTaken === "suspend") && actor.role === "moderator") {
    throw new Error("Unauthorized: Account bans and suspensions require Safety Admin or Super Admin privileges.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Execute enforcement action on reported user
    if (actionTaken === "ban") {
      await tx.user.update({
        where: { id: modCase.reportedId },
        data: { accountStatus: AccountStatus.banned },
      });
      await tx.userProfile.updateMany({
        where: { userId: modCase.reportedId },
        data: { isVisible: false },
      });
    } else if (actionTaken === "suspend") {
      await tx.user.update({
        where: { id: modCase.reportedId },
        data: { accountStatus: AccountStatus.suspended },
      });
      await tx.userProfile.updateMany({
        where: { userId: modCase.reportedId },
        data: { isVisible: false },
      });
    }

    // 2. Update case record
    const updatedCase = await tx.moderationCase.update({
      where: { id: caseId },
      data: {
        status: "reviewed",
        resolution: `Action: ${actionTaken}. Rationale: ${resolution}`,
        resolvedAt: new Date(),
        assignedToId: actor.userId,
      },
    });

    // 3. Immutable audit trail
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: `moderation_case:resolved:${actionTaken}`,
        targetEntity: "moderation_cases",
        targetId: caseId,
        details: { reportedId: modCase.reportedId, actionTaken, resolution },
      },
    });

    logger.info("Moderation case resolved", {
      caseId,
      resolvedBy: actor.userId,
      actionTaken,
    });

    return updatedCase;
  });
}

/**
 * Submits an appeal against an enforcement action.
 */
export async function submitAppeal(userId: string, caseId: string | undefined, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Appeal justification is required.");

  return await prisma.appeal.create({
    data: {
      userId,
      caseId: caseId || null,
      reason: cleanReason,
      status: "pending",
    },
  });
}

/**
 * Reviews and resolves an appeal with due process.
 */
export async function resolveAppeal(
  actor: AuthContext,
  appealId: string,
  decision: "approved" | "rejected",
  decisionNotes: string
) {
  enforceRole(actor, ["safety_admin", "super_admin"]);

  const appeal = await prisma.appeal.findUnique({
    where: { id: appealId },
  });

  if (!appeal) throw new Error("Appeal record not found.");

  return await prisma.$transaction(async (tx) => {
    // If approved, restore user to active status
    if (decision === "approved") {
      await tx.user.update({
        where: { id: appeal.userId },
        data: { accountStatus: AccountStatus.active },
      });
      await tx.userProfile.updateMany({
        where: { userId: appeal.userId },
        data: { isVisible: true },
      });
    }

    const updatedAppeal = await tx.appeal.update({
      where: { id: appealId },
      data: {
        status: decision as AppealStatus,
        reviewerId: actor.userId,
        decisionNotes,
        reviewedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        action: `appeal:${decision}`,
        targetEntity: "appeals",
        targetId: appealId,
        details: { userId: appeal.userId, decision, decisionNotes },
      },
    });

    return updatedAppeal;
  });
}
