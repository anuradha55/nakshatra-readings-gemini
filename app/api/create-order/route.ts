import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds, reserveSlot } from "@/lib/availability";

export const runtime = "nodejs";

// Prices are stored in rupees. Razorpay requires paise.
const STANDARD_BOOKING_AMOUNT_RUPEES = 10;
const COMPLETE_KUNDLI_AMOUNT_RUPEES = 500;
const SLOT_CONFLICT_MESSAGE = "This appointment slot is no longer available. Please choose another slot.";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function POST(request: Request) {
  let reservedSlotId: string | null = null;
  try {
    const { booking } = await request.json();
    if (!booking?.name || !booking?.phone || !booking?.email || !booking?.service || !booking?.slotId) {
      return NextResponse.json({ error: "Please complete the booking details and choose an available appointment slot." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });

    const configuredAmountRupees = booking.service === "Entire Kundli Analysis"
      ? COMPLETE_KUNDLI_AMOUNT_RUPEES
      : STANDARD_BOOKING_AMOUNT_RUPEES;
    const razorpayAmountPaise = configuredAmountRupees * 100;

    const platformPercent = Number(process.env.PLATFORM_SHARE_PERCENT ?? "20");
    const astrologerPercent = Number(process.env.ASTROLOGER_SHARE_PERCENT ?? "80");
    if (!Number.isFinite(platformPercent) || !Number.isFinite(astrologerPercent) || platformPercent < 0 || astrologerPercent < 0 || platformPercent + astrologerPercent !== 100) return NextResponse.json({ error: "Invalid revenue split configuration." }, { status: 500 });

    // Shares are calculated in rupees. Only the Razorpay order amount is converted to paise.
    const platformShare = Math.floor((configuredAmountRupees * platformPercent) / 100);
    const astrologerShare = configuredAmountRupees - platformShare;
    const requestedSlotId = String(booking.slotId);

    await releaseExpiredHolds();
    const existingBooking = await prisma.booking.findUnique({ where: { slotId: requestedSlotId }, select: { id: true, status: true } });
    if (existingBooking) return NextResponse.json({ error: SLOT_CONFLICT_MESSAGE }, { status: 409 });

    reservedSlotId = requestedSlotId;
    await reserveSlot(reservedSlotId);

    try {
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const receipt = `nr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const order = await razorpay.orders.create({
        amount: razorpayAmountPaise,
        currency: "INR",
        receipt,
        notes: { service: booking.service, email: booking.email, slotId: reservedSlotId },
      });

      const savedBooking = await prisma.booking.create({
        data: {
          name: booking.name, phone: booking.phone, email: booking.email, service: booking.service,
          birthDetails: booking.birthdetails || null, amount: Number(order.amount), currency: order.currency,
          razorpayOrderId: order.id, slotId: reservedSlotId, platformShare, astrologerShare, payoutStatus: "PENDING",
        },
      });

      reservedSlotId = null;
      return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency, bookingId: savedBooking.id });
    } catch (paymentSetupError) {
      if (reservedSlotId) {
        if (isUniqueConstraintError(paymentSetupError)) {
          await prisma.availabilitySlot.updateMany({ where: { id: reservedSlotId, status: "HELD" }, data: { status: "BOOKED", holdExpiresAt: null } });
        } else {
          await prisma.availabilitySlot.updateMany({ where: { id: reservedSlotId, status: "HELD" }, data: { status: "AVAILABLE", holdExpiresAt: null } });
        }
      }
      reservedSlotId = null;
      throw paymentSetupError;
    }
  } catch (error) {
    if (reservedSlotId) {
      await prisma.availabilitySlot.updateMany({ where: { id: reservedSlotId, status: "HELD" }, data: { status: "AVAILABLE", holdExpiresAt: null } }).catch((releaseError) => console.error("CREATE_ORDER_SLOT_RELEASE_ERROR", releaseError));
    }

    if (isUniqueConstraintError(error)) {
      console.warn("CREATE_ORDER_SLOT_CONFLICT");
      return NextResponse.json({ error: SLOT_CONFLICT_MESSAGE }, { status: 409 });
    }

    console.error("CREATE_ORDER_ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    const isSlotError = message.includes("slot") || message.includes("Slot");
    return NextResponse.json({ error: isSlotError ? message : "Unable to create payment order." }, { status: isSlotError ? 409 : 500 });
  }
}
