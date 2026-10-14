import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { UnauthorizedError } from "@/lib/auth/rbac";
import {
  addTicketMessage,
  updateTicketStatus,
} from "@/lib/admin/support-service";
import { TicketStatus } from "@prisma/client";
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
    const { content, isInternal } = body;

    const message = await addTicketMessage({
      ticketId,
      sender: actor,
      content,
      isInternal: Boolean(isInternal),
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error adding message to ticket", error);
    return NextResponse.json({ error: error.message || "Failed to post message." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();
    const { status, assignedToId } = body;

    const updatedTicket = await updateTicketStatus(
      actor,
      ticketId,
      status as TicketStatus,
      assignedToId
    );

    return NextResponse.json({ success: true, ticket: updatedTicket }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating ticket", error);
    return NextResponse.json({ error: error.message || "Failed to update ticket." }, { status: 400 });
  }
}
