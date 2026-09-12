import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds } from "@/lib/availability";

export const runtime = "nodejs";

export async function GET() {
  try {
    await releaseExpiredHolds();
    const from = new Date();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const slots = await prisma.availabilitySlot.findMany({
      where: { status: "AVAILABLE", startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: "asc" },
      take: 100,
      select: { id: true, astrologerName: true, startsAt: true, endsAt: true },
    });
    return NextResponse.json({ timezone: "Asia/Kolkata", slots });
  } catch (error) {
    console.error("AVAILABILITY_GET_ERROR", error);
    return NextResponse.json({ error: "Unable to load available appointment slots." }, { status: 500 });
  }
}
