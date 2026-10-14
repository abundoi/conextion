import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createSignedUploadUrl, validateImageUpload } from "@/lib/storage/gcs";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const session = await verifySession(sessionCookie);
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized: Invalid session." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: session.uid },
      select: { id: true, accountStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
      return NextResponse.json({ error: "Account suspended from uploading media." }, { status: 403 });
    }

    const body = await request.json();
    const { contentType, fileSizeBytes } = body;

    const validation = validateImageUpload(contentType, fileSizeBytes);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const uploadData = await createSignedUploadUrl(user.id, contentType, fileSizeBytes);

    return NextResponse.json(uploadData, { status: 200 });
  } catch (error) {
    logger.error("Error generating media upload URL", error);
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
