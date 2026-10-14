import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import { searchAuditLogs } from "@/lib/admin/admin-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["safety_admin", "super_admin"]);

    const searchParams = request.nextUrl.searchParams;
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const targetEntity = searchParams.get("targetEntity") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await searchAuditLogs(actor, {
      actorId,
      action,
      targetEntity,
      limit,
    });

    return NextResponse.json({ success: true, count: logs.length, logs }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error retrieving audit logs", error);
    return NextResponse.json({ error: "Failed to search audit logs." }, { status: 500 });
  }
}
