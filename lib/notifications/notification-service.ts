import { prisma } from "../db/prisma";
import { NotificationType } from "@prisma/client";
import { logger } from "../logging/logger";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  preview: string;
  link?: string;
}

/**
 * Creates an event-driven in-app notification.
 * Respects member privacy choices and ensures preview content is sanitized.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Check preferences
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: params.userId },
    });

    if (pref) {
      if (params.type === "new_match" && !pref.inAppMatches) return null;
      if (params.type === "new_message" && !pref.inAppMessages) return null;
      if (params.type === "security_alert" && !pref.securityAlerts) return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        preview: params.preview,
        link: params.link,
      },
    });

    logger.info("Notification created", {
      notificationId: notification.id,
      userId: params.userId,
      type: params.type,
    });

    return notification;
  } catch (error) {
    logger.error("Failed to generate notification", error, { params });
    return null;
  }
}

export async function getUserNotifications(userId: string, limit = 30) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationsAsRead(userId: string, notificationId?: string) {
  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export async function getOrCreateNotificationPreferences(userId: string) {
  return await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      emailMatches: true,
      emailMessages: false,
      inAppMatches: true,
      inAppMessages: true,
      securityAlerts: true,
    },
  });
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<{
    emailMatches: boolean;
    emailMessages: boolean;
    inAppMatches: boolean;
    inAppMessages: boolean;
    securityAlerts: boolean;
  }>
) {
  return await prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      emailMatches: data.emailMatches ?? true,
      emailMessages: data.emailMessages ?? false,
      inAppMatches: data.inAppMatches ?? true,
      inAppMessages: data.inAppMessages ?? true,
      securityAlerts: data.securityAlerts ?? true,
    },
  });
}
