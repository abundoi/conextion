import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import {
  createSupportTicket,
  getSupportTickets,
} from "@/lib/admin/support-service";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") as TicketStatus) || undefined;
    const category = (searchParams.get("category") as TicketCategory) || undefined;
    const priority = (searchParams.get("priority") as TicketPriority) || undefined;
    const assignedToId = searchParams.get("assignedToId") || undefined;

    const tickets = await getSupportTickets(actor, {
      status,
      category,
      priority,
      assignedToId,
    });

    return NextResponse.json({ success: true, count: tickets.length, tickets }, { status: 200 });
  } catch (error: any) {
    logger.error("Error retrieving tickets", error);
    return NextResponse.json({ error: "Failed to retrieve support tickets." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { subject, category, priority, initialMessage } = body;

    const ticket = await createSupportTicket({
      userId: actor.userId,
      subject,
      category: (category as TicketCategory) || "general_inquiry",
      priority: (priority as TicketPriority) || "medium",
      initialMessage,
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: any) {
    logger.error("Error creating ticket", error);
    return NextResponse.json({ error: error.message || "Failed to create support ticket." }, { status: 400 });
  }
}
