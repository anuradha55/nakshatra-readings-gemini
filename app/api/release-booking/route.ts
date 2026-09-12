import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Releases a slot held by a booking when Razorpay is dismissed or payment fails.
 * Only PENDING bookings can be released, so a successfully paid booking can
 * never have its BOOKED slot returned to availability by this endpoint.
 */
export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) return NextResponse.json({ error: "Booking ID is required." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: String(bookingId) },
        select: { id: true, status: true, slotId: true },
      });

      if (!booking) return { released: false, reason: "not_found" };
      if (booking.status !== "PENDING") return { released: false, reason: "already_processed" };

      if (booking.slotId) {
        await tx.availabilitySlot.updateMany({
          where: { id: booking.slotId, status: "HELD" },
          data: { status: "AVAILABLE", holdExpiresAt: null },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", slotId: null, payoutStatus: "CANCELLED" },
      });

      return { released: true, reason: "released" };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("RELEASE_BOOKING_ERROR", error);
    return NextResponse.json({ error: "Unable to release the appointment slot." }, { status: 500 });
  }
}
