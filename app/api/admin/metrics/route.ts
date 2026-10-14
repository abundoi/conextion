import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import { getPlatformMetrics } from "@/lib/admin/analytics-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["super_admin", "finance_admin", "safety_admin", "analytics_viewer"]);

    const metrics = await getPlatformMetrics(actor);

    return NextResponse.json({ success: true, metrics }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error retrieving analytics metrics", error);
    return NextResponse.json({ error: "Failed to load platform analytics." }, { status: 500 });
  }
}
