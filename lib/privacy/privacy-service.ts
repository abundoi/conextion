import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

/**
 * Compiles a comprehensive, machine-readable GDPR/CCPA data export package for a member.
 */
export async function generateUserDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      preferences: true,
      consents: true,
      photos: {
        select: {
          id: true,
          publicUrl: true,
          isPrimary: true,
          moderationStatus: true,
          createdAt: true,
        },
      },
      interests: {
        include: { interest: true },
      },
      prompts: true,
      matchesAsUser1: {
        select: { id: true, user2Id: true, status: true, matchedAt: true },
      },
      matchesAsUser2: {
        select: { id: true, user1Id: true, status: true, matchedAt: true },
      },
      notifications: {
        take: 50,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) throw new Error("Member account not found.");

  const exportPayload = {
    exportMetadata: {
      platform: "Conextion Dating & Relationship Platform",
      exportedAt: new Date().toISOString(),
      subjectId: user.id,
      complianceStandard: "GDPR Article 15 / CCPA Right of Access",
    },
    account: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    },
    profile: user.profile,
    preferences: user.preferences,
    consents: user.consents.map((c) => ({
      consentType: c.consentType,
      consentVersion: c.consentVersion,
      granted: c.granted,
      timestamp: c.createdAt,
      agreementHash: c.agreementHash,
    })),
    photos: user.photos,
    interests: user.interests.map((i) => i.interest.name),
    prompts: user.prompts.map((p) => ({ prompt: p.promptText, answer: p.answer })),
    matches: [
      ...user.matchesAsUser1.map((m) => ({ matchId: m.id, partnerId: m.user2Id, status: m.status, matchedAt: m.matchedAt })),
      ...user.matchesAsUser2.map((m) => ({ matchId: m.id, partnerId: m.user1Id, status: m.status, matchedAt: m.matchedAt })),
    ],
  };

  // Record export request in privacy audit table
  await prisma.privacyDataRequest.create({
    data: {
      userId,
      type: "export",
      status: "completed",
      completedAt: new Date(),
      payload: exportPayload as any,
    },
  });

  logger.info("GDPR data export generated", { userId });
  return exportPayload;
}

/**
 * Initiates an account deletion request with a 30-day compliance retention schedule.
 */
export async function scheduleAccountDeletion(userId: string, reason?: string) {
  const scheduledPurgeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return await prisma.$transaction(async (tx) => {
    // 1. Immediately hide profile from discovery
    await tx.userProfile.updateMany({
      where: { userId },
      data: { isVisible: false },
    });

    // 2. Mark account deactivated
    await tx.user.update({
      where: { id: userId },
      data: { accountStatus: "deactivated" },
    });

    // 3. Register privacy deletion request
    const request = await tx.privacyDataRequest.create({
      data: {
        userId,
        type: "delete",
        status: "processing",
        scheduledPurgeAt,
        payload: { reason: reason || "User initiated account deletion." },
      },
    });

    // 4. Immutable audit log
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "privacy:deletion_scheduled",
        targetEntity: "users",
        targetId: userId,
        details: { scheduledPurgeAt },
      },
    });

    logger.info("Account deletion scheduled with 30-day grace period", {
      userId,
      scheduledPurgeAt,
    });

    return request;
  });
}

/**
 * Cancels a pending account deletion request and restores member account.
 */
export async function cancelAccountDeletion(userId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { accountStatus: "active" },
    });

    await tx.userProfile.updateMany({
      where: { userId },
      data: { isVisible: true },
    });

    await tx.privacyDataRequest.updateMany({
      where: { userId, type: "delete", status: "processing" },
      data: { status: "cancelled" },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "privacy:deletion_cancelled",
        targetEntity: "users",
        targetId: userId,
      },
    });

    logger.info("Account deletion cancelled, user restored", { userId });
  });
}
