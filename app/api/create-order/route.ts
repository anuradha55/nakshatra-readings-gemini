import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { booking } = await request.json();

    if (!booking?.name || !booking?.phone || !booking?.email || !booking?.service) {
      return NextResponse.json({ error: "Missing required booking details." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });
    }

    const configuredAmount = Number(process.env.BOOKING_AMOUNT ?? "50000");
    if (!Number.isInteger(configuredAmount) || configuredAmount <= 0) {
      return NextResponse.json({ error: "Invalid BOOKING_AMOUNT configuration." }, { status: 500 });
    }

    const platformPercent = Number(process.env.PLATFORM_SHARE_PERCENT ?? "20");
    const astrologerPercent = Number(process.env.ASTROLOGER_SHARE_PERCENT ?? "80");
    if (
      !Number.isFinite(platformPercent) ||
      !Number.isFinite(astrologerPercent) ||
      platformPercent < 0 ||
      astrologerPercent < 0 ||
      platformPercent + astrologerPercent !== 100
    ) {
      return NextResponse.json({ error: "Invalid revenue split configuration." }, { status: 500 });
    }

    // All payment amounts are stored in paise to avoid floating-point money calculations.
    const platformShare = Math.floor((configuredAmount * platformPercent) / 100);
    const astrologerShare = configuredAmount - platformShare;

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = `nr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const order = await razorpay.orders.create({
      amount: configuredAmount,
      currency: "INR",
      receipt,
      notes: { service: booking.service, email: booking.email },
    });

    const savedBooking = await prisma.booking.create({
      data: {
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        service: booking.service,
        birthDetails: booking.birthdetails || null,
        amount: Number(order.amount),
        currency: order.currency,
        razorpayOrderId: order.id,
        platformShare,
        astrologerShare,
        payoutStatus: "PENDING",
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: savedBooking.id,
    });
  } catch (error) {
    console.error("CREATE_ORDER_ERROR", error);
    return NextResponse.json({ error: "Unable to create payment order." }, { status: 500 });
  }
}
