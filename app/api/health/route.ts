import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  let dbStatus = "disconnected";
  try {
    // Ping database query
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "unavailable";
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "conextion-api",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
    },
    { status: 200 }
  );
}
