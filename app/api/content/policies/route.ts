import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { UnauthorizedError } from "@/lib/auth/rbac";
import { getPolicyPage, updatePolicyPage } from "@/lib/admin/support-service";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug") || "terms-of-service";
    const page = await getPolicyPage(slug);
    return NextResponse.json({ success: true, page }, { status: 200 });
  } catch (error: any) {
    logger.error("Error retrieving policy page", error);
    return NextResponse.json({ error: "Failed to load policy page." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { slug, title, content, version } = body;

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Missing required slug, title, or content parameters." }, { status: 400 });
    }

    const updated = await updatePolicyPage(actor, slug, title, content, version);
    return NextResponse.json({ success: true, page: updated }, { status: 200 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating policy page", error);
    return NextResponse.json({ error: error.message || "Failed to update policy." }, { status: 400 });
  }
}
