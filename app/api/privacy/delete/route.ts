import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import {
  scheduleAccountDeletion,
  cancelAccountDeletion,
} from "@/lib/privacy/privacy-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const pendingRequest = await prisma.privacyDataRequest.findFirst({
      where: {
        userId: actor.userId,
        type: "delete",
        status: "processing",
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      hasPendingDeletion: !!pendingRequest,
      deletionRequest: pendingRequest,
    });
  } catch (error: any) {
    logger.error("Error retrieving deletion status", error);
    return NextResponse.json({ error: "Failed to check deletion status." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const deletionRequest = await scheduleAccountDeletion(actor.userId, reason);

    return NextResponse.json(
      {
        success: true,
        message: "Account deletion scheduled. Your profile is hidden and data will be purged after 30 days.",
        scheduledPurgeAt: deletionRequest.scheduledPurgeAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error scheduling account deletion", error);
    return NextResponse.json({ error: error.message || "Failed to schedule account deletion." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    await cancelAccountDeletion(actor.userId);

    return NextResponse.json(
      {
        success: true,
        message: "Account deletion request cancelled. Your account has been restored to active status.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error cancelling account deletion", error);
    return NextResponse.json({ error: error.message || "Failed to cancel account deletion." }, { status: 400 });
  }
}
