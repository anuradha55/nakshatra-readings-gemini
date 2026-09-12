import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, name: true, phone: true, email: true, birthDetails: true, service: true, amount: true, currency: true, status: true, createdAt: true, slot: { select: { startsAt: true, endsAt: true, astrologerName: true } } } });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status !== "PAID") return NextResponse.json({ error: "This booking has not been confirmed yet." }, { status: 403 });

    const astrologerName = booking.slot?.astrologerName || process.env.ASTROLOGER_NAME?.trim() || "Your astrologer";
    const astrologerPhone = process.env.ASTROLOGER_PHONE_NUMBER?.trim();
    if (!astrologerPhone) return NextResponse.json({ error: "Astrologer contact details are not configured yet." }, { status: 500 });
    const digits = astrologerPhone.replace(/\D/g, "");
    const normalizedPhone = digits.startsWith("91") ? "+" + digits : "+91" + digits;

    return NextResponse.json({
      booking: { id: booking.id, name: booking.name, phone: booking.phone, email: booking.email, birthDetails: booking.birthDetails, service: booking.service, amount: booking.amount / 100, currency: booking.currency, status: booking.status, createdAt: booking.createdAt },
      appointment: booking.slot ? { startsAt: booking.slot.startsAt, endsAt: booking.slot.endsAt } : null,
      astrologer: { name: astrologerName, phone: normalizedPhone },
    });
  } catch (error) {
    console.error("BOOKING_CONFIRMATION_ERROR", error);
    return NextResponse.json({ error: "Unable to load booking confirmation." }, { status: 500 });
  }
}
