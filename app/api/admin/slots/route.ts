import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds } from "@/lib/availability";

export const runtime = "nodejs";

function parseIST(date: string, time: string) {
  const value = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(value.getTime())) throw new Error("Invalid date or time.");
  return value;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await releaseExpiredHolds();
  const where = session.role === "astrologer" ? { astrologerEmail: session.email } : {};
  const slots = await prisma.availabilitySlot.findMany({ where, orderBy: { startsAt: "asc" }, take: 200, include: { booking: { select: { id: true, name: true, phone: true, email: true, service: true, status: true } } } });
  return NextResponse.json({ slots, timezone: "Asia/Kolkata" });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { date?: string; startTime?: string; endTime?: string; astrologerEmail?: string; astrologerName?: string };
    const startsAt = parseIST(String(body.date ?? ""), String(body.startTime ?? ""));
    const endsAt = parseIST(String(body.date ?? ""), String(body.endTime ?? ""));
    if (endsAt <= startsAt) return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    if (startsAt <= new Date()) return NextResponse.json({ error: "A slot must be in the future." }, { status: 400 });

    const astrologerEmail = session.role === "astrologer" ? session.email : String(body.astrologerEmail || process.env.ASTROLOGER_EMAILS?.split(",")[0] || "").trim().toLowerCase();
    const astrologerName = session.role === "astrologer" ? session.name : String(body.astrologerName || process.env.ASTROLOGER_NAME || "Astrologer").trim();
    if (!astrologerEmail) return NextResponse.json({ error: "Configure ASTROLOGER_EMAILS before creating slots." }, { status: 500 });

    const overlap = await prisma.availabilitySlot.findFirst({ where: { astrologerEmail, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, status: { not: "BLOCKED" } } });
    if (overlap) return NextResponse.json({ error: "This time overlaps an existing slot." }, { status: 409 });

    const slot = await prisma.availabilitySlot.create({ data: { astrologerEmail, astrologerName, startsAt, endsAt } });
    return NextResponse.json({ slot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create slot." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { id?: string; action?: "block" | "open" };
    if (!body.id || !body.action) return NextResponse.json({ error: "Slot ID and action are required." }, { status: 400 });
    const existing = await prisma.availabilitySlot.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    if (session.role === "astrologer" && existing.astrologerEmail !== session.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status === "BOOKED") return NextResponse.json({ error: "A booked slot cannot be changed here." }, { status: 409 });
    const status = body.action === "block" ? "BLOCKED" : "AVAILABLE";
    const slot = await prisma.availabilitySlot.update({ where: { id: body.id }, data: { status, holdExpiresAt: null } });
    return NextResponse.json({ slot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update slot." }, { status: 400 });
  }
}
