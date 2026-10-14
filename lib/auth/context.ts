import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "./session";
import { prisma } from "../db/prisma";
import { AuthContext, Role } from "./rbac";

/**
 * Extracts and verifies the authenticated user context from incoming Next.js requests.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySession(sessionCookie);
  if (!session?.uid) return null;

  const user = await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
    select: {
      id: true,
      firebaseUid: true,
      email: true,
      role: true,
      accountStatus: true,
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    role: user.role as Role,
    accountStatus: user.accountStatus,
  };
}
