import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import {
  getModerationCases,
  createModerationCase,
} from "@/lib/moderation/moderation-service";
import { CasePriority, ReportCategory, ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["moderator", "safety_admin", "super_admin"]);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as ReportStatus | null;
    const priority = searchParams.get("priority") as CasePriority | null;
    const assignedToId = searchParams.get("assignedToId") || undefined;

    const cases = await getModerationCases(actor, {
      status: status || undefined,
      priority: priority || undefined,
      assignedToId,
    });

    return NextResponse.json({ success: true, count: cases.length, cases }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error retrieving moderation cases", error);
    return NextResponse.json({ error: "Failed to retrieve moderation queue." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { reportedId, category, details, evidence } = body;

    if (!reportedId || typeof reportedId !== "string") {
      return NextResponse.json({ error: "Missing reportedId." }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Missing report category." }, { status: 400 });
    }

    const modCase = await createModerationCase({
      reporterId: actor.userId,
      reportedId,
      category: category as ReportCategory,
      details,
      evidence,
    });

    return NextResponse.json({ success: true, case: modCase }, { status: 201 });
  } catch (error: any) {
    logger.error("Error creating moderation case", error);
    return NextResponse.json({ error: error.message || "Failed to create case." }, { status: 400 });
  }
}
