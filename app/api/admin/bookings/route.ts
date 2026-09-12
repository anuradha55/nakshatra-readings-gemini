import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await prisma.booking.findMany({
    where: session.role === "astrologer" ? { slot: { astrologerEmail: session.email } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, name: true, phone: true, email: true, service: true, birthDetails: true,
      amount: true, currency: true, status: true, createdAt: true, paymentVerifiedAt: true,
      slot: { select: { id: true, astrologerName: true, startsAt: true, endsAt: true, status: true } },
      payout: { select: { status: true, payoutAmount: true } },
    },
  });
  return NextResponse.json({ bookings, timezone: "Asia/Kolkata" });
}
