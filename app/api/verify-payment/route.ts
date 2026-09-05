import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";

async function sendBookingConfirmationWhatsApp(booking: {
  id: string;
  name: string;
  phone: string;
  service: string;
  amount: number;
  razorpayPaymentId: string | null;
}) {
  const templateName = process.env.WHATSAPP_BOOKING_TEMPLATE_NAME;

  if (!templateName) {
    console.error("BOOKING_WHATSAPP_CONFIG_ERROR: WHATSAPP_BOOKING_TEMPLATE_NAME is missing");
    return { sent: false };
  }

  const amount = (booking.amount / 100).toFixed(2);

  const result = await sendWhatsAppTemplate({
    to: booking.phone,
    templateName,
    bodyParameters: [
      booking.name || "Customer",
      booking.service,
      `₹${amount}`,
      booking.id,
    ],
  });

  if (!result.sent) {
    console.error("BOOKING_WHATSAPP_NOT_SENT", {
      bookingId: booking.id,
      phone: booking.phone,
      error: result.error ?? null,
    });
  }

  return result;
}

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
    // payment must never be shown as failed just because WhatsApp is unavailable.
    const whatsappResult =
      updated.count > 0
        ? await sendBookingConfirmationWhatsApp({
            id: latest.id,
            name: latest.name,
            phone: latest.phone,
            service: latest.service,
            amount: latest.amount,
            razorpayPaymentId: razorpay_payment_id,
          })
        : { sent: true };

    console.log("PAID_BOOKING", {
      bookingId,
      phone: latest.phone,
      razorpayOrderId: latest.razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id,
      whatsappSent: whatsappResult.sent,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: updated.count === 0,
      whatsappSent: whatsappResult.sent,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
