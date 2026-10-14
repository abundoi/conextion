import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbStatus: "connected" | "unavailable" | "degraded" = "unavailable";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = dbLatencyMs > 500 ? "degraded" : "connected";
  } catch (error) {
    dbStatus = "unavailable";
  }

  const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;
  const uptimeSeconds = process.uptime ? Math.floor(process.uptime()) : 0;
  const totalDurationMs = Date.now() - startTime;

  const isHealthy = dbStatus === "connected" || dbStatus === "degraded";

  return NextResponse.json(
    {
      status: isHealthy ? (dbStatus === "degraded" ? "degraded" : "healthy") : "unhealthy",
      service: "conextion-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        latencyMs: totalDurationMs,
        memory: memoryUsage
          ? {
              heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
              heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
              rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
            }
          : undefined,
      },
      environment: process.env.NODE_ENV || "development",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
