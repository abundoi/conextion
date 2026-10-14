import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { UnauthorizedError } from "@/lib/auth/rbac";
import { escalateTicketToSafety } from "@/lib/admin/support-service";
import { logger } from "@/lib/logging/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Escalation reason is required." }, { status: 400 });
    }

    const result = await escalateTicketToSafety(actor, ticketId, reason.trim());

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error escalating ticket to safety", error);
    return NextResponse.json({ error: error.message || "Failed to escalate ticket." }, { status: 400 });
  }
}
