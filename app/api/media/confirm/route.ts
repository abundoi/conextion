import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const body = await request.json();
    const { storagePath, isPrimary = false } = body;

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "Missing required storagePath parameter." }, { status: 400 });
    }

    // Security check: Verify path belongs strictly to authenticated user
    const expectedPrefix = `users/${user.id}/photos/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      logger.warn("Potential path traversal or cross-account upload attempt", {
        userId: user.id,
        storagePath,
      });
      return NextResponse.json(
        { error: "Forbidden: Storage path does not belong to the authenticated member." },
        { status: 403 }
      );
    }

    const bucketName = process.env.GCS_BUCKET_NAME || "conextion-dev-private-media";
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;

    // If setting as primary, unset other primary photos
    if (isPrimary) {
      await prisma.profilePhoto.updateMany({
        where: { userId: user.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const photo = await prisma.profilePhoto.create({
      data: {
        userId: user.id,
        storagePath,
        publicUrl,
        isPrimary,
        moderationStatus: "pending_review",
      },
    });

    logger.info("New profile photo registered, queued for moderation", {
      userId: user.id,
      photoId: photo.id,
    });

    return NextResponse.json(
      {
        success: true,
        photo: {
          id: photo.id,
          publicUrl: photo.publicUrl,
          isPrimary: photo.isPrimary,
          moderationStatus: photo.moderationStatus,
          createdAt: photo.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error confirming uploaded media", error);
    return NextResponse.json({ error: "Failed to register uploaded photo." }, { status: 500 });
  }
}
