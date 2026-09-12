import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { bookSlot } from "@/lib/availability";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_signature, bookingId } = await request.json();
    if (!razorpay_payment_id || !razorpay_signature || !bookingId) return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay secret is not configured." }, { status: 500 });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled because payment was not completed. Please start a new booking." }, { status: 409 });
    const expectedSignature = crypto.createHmac("sha256", secret).update(`${booking.razorpayOrderId}|${razorpay_payment_id}`).digest("hex");
    if (expectedSignature.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expectedSignature, "utf8"), Buffer.from(razorpay_signature, "utf8"))) return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });

    if (booking.status !== "PAID") {
      await prisma.booking.updateMany({ where: { id: bookingId, razorpayOrderId: booking.razorpayOrderId, status: "PENDING" }, data: { status: "PAID", razorpayPaymentId: razorpay_payment_id, paymentVerifiedAt: new Date() } });
    } else if (booking.razorpayPaymentId && booking.razorpayPaymentId !== razorpay_payment_id) {
      return NextResponse.json({ error: "Booking is already associated with a different payment." }, { status: 409 });
    }

    const latest = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!latest || latest.status !== "PAID") return NextResponse.json({ error: "Booking could not be marked paid." }, { status: 409 });
    if (latest.razorpayPaymentId && latest.razorpayPaymentId !== razorpay_payment_id) return NextResponse.json({ error: "Booking is already associated with a different payment." }, { status: 409 });

    if (latest.slotId) {
      try {
        await bookSlot(latest.slotId, latest.id);
      } catch (slotError) {
        console.error("PAYMENT_SLOT_FINALIZATION_ERROR", { bookingId: latest.id, slotId: latest.slotId, slotError });
        return NextResponse.json({ error: "Payment was verified, but the selected appointment slot could not be finalized. Please contact support; do not make another payment." }, { status: 409 });
      }
    }

    return NextResponse.json({ success: true, alreadyProcessed: booking.status === "PAID" });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
