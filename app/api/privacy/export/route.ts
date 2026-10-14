import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { generateUserDataExport } from "@/lib/privacy/privacy-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const exportData = await generateUserDataExport(actor.userId);

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="conextion-data-export-${actor.userId.substring(0, 8)}.json"`,
      },
    });
  } catch (error: any) {
    logger.error("Error generating privacy data export", error);
    return NextResponse.json({ error: error.message || "Failed to generate export." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
