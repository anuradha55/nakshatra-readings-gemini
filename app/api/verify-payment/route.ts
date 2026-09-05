import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendCustomerBookingSms } from "@/lib/twilio";

export const runtime = "nodejs";


export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_signature, bookingId } = await request.json();

    if (!razorpay_payment_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Razorpay secret is not configured." }, { status: 500 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (!booking.razorpayOrderId) {
      return NextResponse.json({ error: "Booking has no Razorpay order." }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${booking.razorpayOrderId}|${razorpay_payment_id}`)
      .digest("hex");

    if (
      expectedSignature.length !== razorpay_signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(razorpay_signature, "utf8")
      )
    ) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const updated = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        razorpayOrderId: booking.razorpayOrderId,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        razorpayPaymentId: razorpay_payment_id,
        paymentVerifiedAt: new Date(),
      },
    });

    const latest = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!latest || latest.status !== "PAID") {
      return NextResponse.json({ error: "Booking could not be marked paid." }, { status: 409 });
    }

    if (latest.razorpayPaymentId && latest.razorpayPaymentId !== razorpay_payment_id) {
      return NextResponse.json({ error: "Booking is already associated with a different payment." }, { status: 409 });
    }

    // Notification delivery is intentionally non-fatal: a successful Razorpay
    // payment must never be shown as failed just because SMS delivery fails.
    const customerSmsResult =
      updated.count > 0
        ? await sendCustomerBookingSms({
            id: latest.id,
            name: latest.name,
            phone: latest.phone,
            service: latest.service,
            amount: latest.amount,
          })
        : { sent: true };

    console.log("PAID_BOOKING", {
      bookingId,
      phone: latest.phone,
      razorpayOrderId: latest.razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id,
      customerSmsSent: customerSmsResult.sent,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: updated.count === 0,
      customerSmsSent: customerSmsResult.sent,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
