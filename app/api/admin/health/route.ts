import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { getSystemHealth } from "@/lib/admin/admin-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    // Allow unauthenticated health check for DevOps / monitoring probes if requested,
    // or return full system health diagnostics if authorized.
    const health = await getSystemHealth(actor || undefined);
    return NextResponse.json({ success: true, ...health }, { status: 200 });
  } catch (error: any) {
    logger.error("Error retrieving system health", error);
    return NextResponse.json({ error: "System health check failed." }, { status: 500 });
  }
}
