import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import {
  resolveModerationCase,
  addCaseNote,
} from "@/lib/moderation/moderation-service";
import { logger } from "@/lib/logging/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);
    const { id: caseId } = await params;

    const modCase = await prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: {
        reporter: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
        reported: {
          select: {
            id: true,
            email: true,
            role: true,
            accountStatus: true,
            profile: true,
            photos: true,
          },
        },
        assignedTo: {
          select: { id: true, email: true, role: true },
        },
        notes: {
          include: { author: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        appeals: true,
      },
    });

    if (!modCase) {
      return NextResponse.json({ error: "Moderation case not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: modCase }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error retrieving case details", error);
    return NextResponse.json({ error: "Failed to retrieve case details." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);
    const { id: caseId } = await params;
    const body = await request.json();
    const { resolution, actionTaken } = body;

    if (!resolution || typeof resolution !== "string") {
      return NextResponse.json({ error: "Resolution rationale is required." }, { status: 400 });
    }

    if (!["dismiss", "warning", "reject_content", "suspend", "ban"].includes(actionTaken)) {
      return NextResponse.json({ error: "Invalid actionTaken value." }, { status: 400 });
    }

    const updatedCase = await resolveModerationCase({
      caseId,
      actor,
      resolution,
      actionTaken,
    });

    return NextResponse.json({ success: true, case: updatedCase }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error resolving moderation case", error);
    return NextResponse.json({ error: error.message || "Failed to resolve case." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);
    const { id: caseId } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ error: "Case note content is required." }, { status: 400 });
    }

    const createdNote = await addCaseNote(actor, caseId, note);
    return NextResponse.json({ success: true, note: createdNote }, { status: 201 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error adding case note", error);
    return NextResponse.json({ error: error.message || "Failed to add note." }, { status: 400 });
  }
}
