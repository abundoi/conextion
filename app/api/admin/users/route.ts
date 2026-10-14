import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import {
  listMemberAccounts,
  updateUserRole,
  updateAccountStatus,
} from "@/lib/admin/admin-service";
import { UserRole, AccountStatus } from "@prisma/client";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["moderator", "support_agent", "safety_admin", "super_admin"]);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const role = (searchParams.get("role") as UserRole) || undefined;
    const accountStatus = (searchParams.get("accountStatus") as AccountStatus) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await listMemberAccounts(actor, {
      search,
      role,
      accountStatus,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error listing accounts", error);
    return NextResponse.json({ error: "Failed to list member accounts." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, action, newRole, newStatus, reason, justification } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId parameter." }, { status: 400 });
    }

    if (action === "update_role") {
      if (!newRole) return NextResponse.json({ error: "Missing newRole parameter." }, { status: 400 });
      const updated = await updateUserRole(actor, targetUserId, newRole as UserRole, justification || "");
      return NextResponse.json({ success: true, user: updated }, { status: 200 });
    }

    if (action === "update_status") {
      if (!newStatus) return NextResponse.json({ error: "Missing newStatus parameter." }, { status: 400 });
      const updated = await updateAccountStatus(actor, targetUserId, newStatus as AccountStatus, reason || "");
      return NextResponse.json({ success: true, user: updated }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action. Must be 'update_role' or 'update_status'." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating account", error);
    return NextResponse.json({ error: error.message || "Failed to update account." }, { status: 400 });
  }
}
