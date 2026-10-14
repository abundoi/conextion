import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { submitAppeal, resolveAppeal } from "@/lib/moderation/moderation-service";
import { AppealStatus } from "@prisma/client";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as AppealStatus | null;

    // Staff sees all appeals; members see only their own
    const isStaff = ["moderator", "safety_admin", "super_admin"].includes(actor.role);

    const appeals = await prisma.appeal.findMany({
      where: {
        ...(isStaff ? {} : { userId: actor.userId }),
        ...(status ? { status } : {}),
      },
      include: {
        user: { select: { id: true, email: true, accountStatus: true } },
        reviewer: { select: { id: true, email: true, role: true } },
        case: { select: { id: true, category: true, priority: true, resolution: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: appeals.length, appeals }, { status: 200 });
  } catch (error: any) {
    logger.error("Error retrieving appeals", error);
    return NextResponse.json({ error: "Failed to retrieve appeals." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, reason } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Appeal justification reason is required." }, { status: 400 });
    }

    const appeal = await submitAppeal(actor.userId, caseId, reason);
    return NextResponse.json({ success: true, appeal }, { status: 201 });
  } catch (error: any) {
    logger.error("Error submitting appeal", error);
    return NextResponse.json({ error: error.message || "Failed to submit appeal." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["safety_admin", "super_admin"]);

    const body = await request.json();
    const { appealId, decision, decisionNotes } = body;

    if (!appealId || typeof appealId !== "string") {
      return NextResponse.json({ error: "Missing appealId." }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Decision must be 'approved' or 'rejected'." }, { status: 400 });
    }

    if (!decisionNotes || typeof decisionNotes !== "string") {
      return NextResponse.json({ error: "Reviewer decision notes are required." }, { status: 400 });
    }

    const updatedAppeal = await resolveAppeal(actor, appealId, decision, decisionNotes);
    return NextResponse.json({ success: true, appeal: updatedAppeal }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error resolving appeal", error);
    return NextResponse.json({ error: error.message || "Failed to resolve appeal." }, { status: 400 });
  }
}
