import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds } from "@/lib/availability";
import { ensureDailySessions } from "@/lib/daily-slots";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureDailySessions();
    await releaseExpiredHolds();
    const from = new Date();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const slots = await prisma.availabilitySlot.findMany({
      where: { status: "AVAILABLE", startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: "asc" },
      take: 1000,
      select: { id: true, astrologerName: true, startsAt: true, endsAt: true },
    });
    return NextResponse.json({ timezone: "Asia/Kolkata", slots });
  } catch (error) {
    console.error("AVAILABILITY_GET_ERROR", error);
    return NextResponse.json({ error: "Unable to load available appointment slots." }, { status: 500 });
  }
}
