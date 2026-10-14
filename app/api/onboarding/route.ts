import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getOrSeedInterests,
  saveProfile,
  savePreferences,
  saveInterests,
  savePrompts,
  publishProfile,
} from "@/lib/profile/profile-service";
import { logger } from "@/lib/logging/logger";

const PROMPT_TEMPLATES = [
  "A life goal of mine is...",
  "Together, we could...",
  "My simple pleasures include...",
  "The best way to spend a Sunday is...",
  "I am weirdly passionate about...",
  "The hallmark of a great conversation is...",
];

async function getAuthUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySession(sessionCookie);
  if (!session?.uid) return null;

  return await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
    include: {
      profile: true,
      preferences: true,
      interests: { include: { interest: true } },
      prompts: true,
      photos: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availableInterests = await getOrSeedInterests();

    return NextResponse.json(
      {
        user,
        availableInterests,
        availablePrompts: PROMPT_TEMPLATES,
        isComplete: user.profile?.isProfileComplete ?? false,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching onboarding data", error);
    return NextResponse.json({ error: "Failed to load onboarding info." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    switch (step) {
      case "basic": {
        const saved = await saveProfile(user.id, data);
        return NextResponse.json({ success: true, profile: saved }, { status: 200 });
      }

      case "preferences": {
        const saved = await savePreferences(user.id, data);
        return NextResponse.json({ success: true, preferences: saved }, { status: 200 });
      }

      case "interests": {
        const saved = await saveInterests(user.id, data.interestSlugs || []);
        return NextResponse.json({ success: true, interests: saved }, { status: 200 });
      }

      case "prompts": {
        await savePrompts(user.id, data.prompts || []);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      case "publish": {
        await publishProfile(user.id);
        return NextResponse.json(
          { success: true, message: "Profile successfully verified and published." },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json({ error: `Unknown onboarding step: ${step}` }, { status: 400 });
    }
  } catch (error: any) {
    logger.error("Error processing onboarding step", error);
    return NextResponse.json({ error: error.message || "Onboarding step failed." }, { status: 400 });
  }
}
