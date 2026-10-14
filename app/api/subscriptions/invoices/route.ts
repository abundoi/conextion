import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { getMemberInvoices } from "@/lib/subscriptions/payment-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const invoices = await getMemberInvoices(actor.userId);

    return NextResponse.json(
      {
        success: true,
        count: invoices.length,
        invoices,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error retrieving invoices", error);
    return NextResponse.json({ error: "Failed to retrieve invoice history." }, { status: 500 });
  }
}
