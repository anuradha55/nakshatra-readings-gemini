import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Razorpay secret is not configured." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const valid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!valid) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: "Order does not match booking." }, { status: 400 });
    }

    const updated = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        razorpayOrderId: razorpay_order_id,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        razorpayPaymentId: razorpay_payment_id,
        paymentVerifiedAt: new Date(),
      },
    });

    // Idempotency: if the browser retries after the booking is already PAID,
    // return success without creating another payment record.
    if (updated.count === 0) {
      const latest = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (latest?.status === "PAID" && latest.razorpayPaymentId === razorpay_payment_id) {
        return NextResponse.json({ success: true, alreadyProcessed: true });
      }
      return NextResponse.json({ error: "Booking could not be marked paid." }, { status: 409 });
    }

    console.log("PAID BOOKING", {
      bookingId,
      email: booking.email,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
