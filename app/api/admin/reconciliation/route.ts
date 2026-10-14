import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { enforceRole, UnauthorizedError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { reconcileSubscriptions } from "@/lib/subscriptions/reconciliation-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["finance_admin", "super_admin"]);

    const history = await prisma.reconciliationRecord.findMany({
      include: {
        reconciledBy: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, count: history.length, history }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error retrieving reconciliation history", error);
    return NextResponse.json({ error: "Failed to load reconciliation records." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    enforceRole(actor, ["finance_admin", "super_admin"]);

    const report = await reconcileSubscriptions(actor);

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error running reconciliation", error);
    return NextResponse.json({ error: error.message || "Reconciliation failed." }, { status: 400 });
  }
}
