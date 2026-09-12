import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { reserveSlot } from "@/lib/availability";

export const runtime = "nodejs";

const STANDARD_BOOKING_AMOUNT = 10000;
const COMPLETE_KUNDLI_AMOUNT = 50000;

export async function POST(request: Request) {
  try {
    const { booking } = await request.json();
    if (!booking?.name || !booking?.phone || !booking?.email || !booking?.service || !booking?.slotId) {
      return NextResponse.json({ error: "Please complete the booking details and choose an available appointment slot." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });

    const configuredAmount = booking.service === "Entire Kundli Analysis"
      ? COMPLETE_KUNDLI_AMOUNT
      : STANDARD_BOOKING_AMOUNT;

    const platformPercent = Number(process.env.PLATFORM_SHARE_PERCENT ?? "20");
    const astrologerPercent = Number(process.env.ASTROLOGER_SHARE_PERCENT ?? "80");
    if (!Number.isFinite(platformPercent) || !Number.isFinite(astrologerPercent) || platformPercent < 0 || astrologerPercent < 0 || platformPercent + astrologerPercent !== 100) return NextResponse.json({ error: "Invalid revenue split configuration." }, { status: 500 });

    const platformShare = Math.floor((configuredAmount * platformPercent) / 100);
    const astrologerShare = configuredAmount - platformShare;
    await reserveSlot(String(booking.slotId));

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = `nr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const order = await razorpay.orders.create({ amount: configuredAmount, currency: "INR", receipt, notes: { service: booking.service, email: booking.email, slotId: String(booking.slotId) } });

    const savedBooking = await prisma.booking.create({
      data: {
        name: booking.name, phone: booking.phone, email: booking.email, service: booking.service,
        birthDetails: booking.birthdetails || null, amount: Number(order.amount), currency: order.currency,
        razorpayOrderId: order.id, slotId: String(booking.slotId), platformShare, astrologerShare, payoutStatus: "PENDING",
      },
    });

    return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency, bookingId: savedBooking.id });
  } catch (error) {
    console.error("CREATE_ORDER_ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    const razorpayError = error as { statusCode?: number; error?: { description?: string; reason?: string; code?: string } };
    return NextResponse.json({ error: message.includes("slot") || message.includes("Slot") ? message : "Unable to create payment order.", diagnostic: { message, statusCode: razorpayError.statusCode ?? null, razorpayCode: razorpayError.error?.code ?? null, razorpayDescription: razorpayError.error?.description ?? null, razorpayReason: razorpayError.error?.reason ?? null } }, { status: message.includes("slot") || message.includes("Slot") ? 409 : 500 });
  }
}
