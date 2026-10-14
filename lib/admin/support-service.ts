import { prisma } from "../db/prisma";
import { AuthContext, enforceRole } from "../auth/rbac";
import { createModerationCase } from "../moderation/moderation-service";
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  ReportCategory,
} from "@prisma/client";
import { logger } from "../logging/logger";

export interface CreateTicketParams {
  userId: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  initialMessage: string;
}

export interface AddTicketMessageParams {
  ticketId: string;
  sender: AuthContext;
  content: string;
  isInternal?: boolean;
}

/**
 * Creates a new customer support ticket filed by a member.
 */
export async function createSupportTicket(params: CreateTicketParams) {
  const { userId, subject, category, priority = "medium", initialMessage } = params;

  if (!subject.trim()) throw new Error("Ticket subject is required.");
  if (!initialMessage.trim()) throw new Error("Initial message is required.");

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        userId,
        subject: subject.trim(),
        category,
        priority,
        status: "open",
      },
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        content: initialMessage.trim(),
        isInternal: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "support_ticket:created",
        targetEntity: "support_tickets",
        targetId: ticket.id,
        details: { category, priority, subject },
      },
    });

    return ticket;
  });
}

/**
 * Retrieves support tickets with role enforcement.
 * Staff (support_agent, safety_admin, super_admin) view queue; members view their own tickets.
 */
export async function getSupportTickets(
  actor: AuthContext,
  filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    assignedToId?: string;
  }
) {
  const isStaff = ["support_agent", "safety_admin", "super_admin"].includes(actor.role);

  return await prisma.supportTicket.findMany({
    where: {
      ...(isStaff ? {} : { userId: actor.userId }),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
      ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    },
    include: {
      user: { select: { id: true, email: true, role: true, accountStatus: true } },
      assignedTo: { select: { id: true, email: true, role: true } },
      messages: {
        where: isStaff ? {} : { isInternal: false }, // Strip internal staff notes from member responses
        include: { sender: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Adds a message or confidential internal note to a support ticket.
 */
export async function addTicketMessage(params: AddTicketMessageParams) {
  const { ticketId, sender, content, isInternal = false } = params;
  const isStaff = ["support_agent", "safety_admin", "super_admin"].includes(sender.role);

  // Members cannot post internal notes
  if (isInternal && !isStaff) {
    throw new Error("Unauthorized: Internal staff notes require support agent privileges.");
  }

  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("Message content cannot be empty.");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) throw new Error("Support ticket not found.");

  // Access check: must be staff or ticket owner
  if (!isStaff && ticket.userId !== sender.userId) {
    throw new Error("Forbidden: You cannot reply to another member's ticket.");
  }

  return await prisma.$transaction(async (tx) => {
    const msg = await tx.ticketMessage.create({
      data: {
        ticketId,
        senderId: sender.userId,
        content: cleanContent,
        isInternal,
      },
      include: {
        sender: { select: { id: true, email: true, role: true } },
      },
    });

    // Update ticket status
    let newStatus: TicketStatus = ticket.status;
    if (isStaff && !isInternal) {
      newStatus = "waiting_member";
    } else if (!isStaff) {
      newStatus = "in_progress";
    }

    await tx.supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, updatedAt: new Date() },
    });

    return msg;
  });
}

/**
 * Updates support ticket status or assigns ticket to a staff member.
 */
export async function updateTicketStatus(
  actor: AuthContext,
  ticketId: string,
  status: TicketStatus,
  assignedToId?: string
) {
  enforceRole(actor, ["support_agent", "safety_admin", "super_admin"]);

  const data: any = { status, updatedAt: new Date() };
  if (status === "resolved" || status === "closed") {
    data.resolvedAt = new Date();
  }
  if (assignedToId !== undefined) {
    data.assignedToId = assignedToId || null;
  }

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.userId,
      action: `support_ticket:${status}`,
      targetEntity: "support_tickets",
      targetId: ticketId,
      details: { assignedToId, status },
    },
  });

  return updatedTicket;
}

/**
 * Escalates a customer support ticket to the Trust & Safety team.
 * Creates an authoritative ModerationCase with critical/high priority.
 */
export async function escalateTicketToSafety(
  actor: AuthContext,
  ticketId: string,
  reason: string
) {
  enforceRole(actor, ["support_agent", "safety_admin", "super_admin"]);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: true },
  });

  if (!ticket) throw new Error("Ticket not found.");

  // Create high-priority moderation case
  const modCase = await createModerationCase({
    reporterId: actor.userId,
    reportedId: ticket.userId,
    category: "safety_concern" as ReportCategory,
    details: `[Escalated from Support Ticket #${ticket.id.substring(0, 8)}] ${reason}`,
    evidence: { ticketId: ticket.id, subject: ticket.subject },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      escalatedToSafety: true,
      priority: "urgent",
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.userId,
      action: "support_ticket:escalated_to_safety",
      targetEntity: "support_tickets",
      targetId: ticketId,
      details: { moderationCaseId: modCase.id, reason },
    },
  });

  logger.warn("Support ticket escalated to Trust & Safety", {
    ticketId,
    moderationCaseId: modCase.id,
    escalatedBy: actor.userId,
  });

  return { ticket, moderationCase: modCase };
}

/**
 * Retrieves or initializes an editable public policy page.
 */
export async function getPolicyPage(slug: string) {
  let page = await prisma.policyPage.findUnique({
    where: { slug },
  });

  if (!page) {
    // Provide initial default policy templates
    const defaultTemplates: Record<string, { title: string; content: string }> = {
      "terms-of-service": {
        title: "Terms of Service",
        content: "# Terms of Service\n\nWelcome to Conextion. You must be at least 18 years of age to use this service. By creating an account, you agree to our zero-tolerance policy against harassment, impersonation, and non-consensual sharing of private content.",
      },
      "privacy-policy": {
        title: "Privacy Policy",
        content: "# Privacy Policy\n\nConextion values your privacy. We never publicly display your precise GPS coordinates or full date of birth. Members enjoy complete GDPR Article 15 data portability and Article 17 erasure rights.",
      },
      "community-guidelines": {
        title: "Community Guidelines",
        content: "# Community Guidelines\n\n1. Be authentic.\n2. Respect boundaries.\n3. Zero tolerance for hate speech, harassment, or commercial solicitation.",
      },
      "faq": {
        title: "Frequently Asked Questions",
        content: "### How does matching work?\nMutual matching occurs when two members mutually like each other.\n\n### How is my age verified?\nDuring onboarding, age assurance controls verify you are an eligible adult (18+).",
      },
    };

    const initial = defaultTemplates[slug] || {
      title: slug.replace(/-/g, " ").toUpperCase(),
      content: `# ${slug}\n\nContent coming soon.`,
    };

    page = await prisma.policyPage.create({
      data: {
        slug,
        title: initial.title,
        content: initial.content,
        version: "1.0.0",
        published: true,
      },
    });
  }

  return page;
}

/**
 * Updates a public policy page (Super Admin only).
 */
export async function updatePolicyPage(
  actor: AuthContext,
  slug: string,
  title: string,
  content: string,
  version = "1.0.0"
) {
  enforceRole(actor, ["super_admin"]);

  const updated = await prisma.policyPage.upsert({
    where: { slug },
    create: {
      slug,
      title,
      content,
      version,
      published: true,
      updatedById: actor.userId,
    },
    update: {
      title,
      content,
      version,
      updatedById: actor.userId,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.userId,
      action: "policy_page:updated",
      targetEntity: "policy_pages",
      targetId: slug,
      details: { title, version },
    },
  });

  return updated;
}
