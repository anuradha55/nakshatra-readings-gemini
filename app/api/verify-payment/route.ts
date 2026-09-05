import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendBookingConfirmationEmail(booking: {
  id: string;
  name: string;
  email: string;
  service: string;
  birthDetails: string | null;
  amount: number;
  razorpayPaymentId: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("BOOKING_EMAIL_CONFIG_ERROR", {
      hasResendKey: Boolean(apiKey),
      hasFromEmail: Boolean(from),
    });
    return { sent: false };
  }

  const amount = (booking.amount / 100).toFixed(2);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2 style="color:#6b4f1d">🔮 Your Nakshatra Reading Booking is Confirmed</h2>
      <p>Hello ${escapeHtml(booking.name)},</p>
      <p>Thank you for booking your astrology consultation with Nakshatra Readings. Your payment has been successfully confirmed.</p>
      <table style="border-collapse:collapse;margin:18px 0">
        <tr><td style="padding:6px 12px 6px 0"><strong>Service:</strong></td><td>${escapeHtml(booking.service)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Amount paid:</strong></td><td>₹${amount}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Payment ID:</strong></td><td>${escapeHtml(booking.razorpayPaymentId ?? "Confirmed")}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Booking ID:</strong></td><td>${escapeHtml(booking.id)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Birth details:</strong></td><td>${escapeHtml(booking.birthDetails ?? "Not provided")}</td></tr>
      </table>
      <p>We will contact you shortly to schedule your consultation.</p>
      <p>— Nakshatra Readings</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [booking.email],
        subject: "Booking confirmed – Nakshatra Readings",
        html,
        text: [
          `Hello ${booking.name},`,
          "",
          "Your Nakshatra Readings booking and payment have been confirmed.",
          `Service: ${booking.service}`,
          `Amount paid: ₹${amount}`,
          `Payment ID: ${booking.razorpayPaymentId ?? "Confirmed"}`,
          `Booking ID: ${booking.id}`,
          "",
          "We will contact you shortly to schedule your consultation.",
          "— Nakshatra Readings",
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("BOOKING_EMAIL_SEND_ERROR", response.status, details);
      return { sent: false };
    }

    const data = await response.json().catch(() => ({}));
    console.log("BOOKING_EMAIL_SENT", {
      bookingId: booking.id,
      email: booking.email,
      resendId: data?.id ?? null,
    });

    return { sent: true };
  } catch (error) {
    console.error("BOOKING_EMAIL_ERROR", error);
    return { sent: false };
  }
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

    // Email delivery is intentionally non-fatal: a successful Razorpay payment
    // must never be shown as failed just because Resend has a temporary issue.
    const emailResult =
      updated.count > 0
        ? await sendBookingConfirmationEmail({
            id: latest.id,
            name: latest.name,
            email: latest.email,
            service: latest.service,
            birthDetails: latest.birthDetails,
            amount: latest.amount,
            razorpayPaymentId: razorpay_payment_id,
          })
        : { sent: true };

    console.log("PAID_BOOKING", {
      bookingId,
      email: latest.email,
      razorpayOrderId: latest.razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id,
      emailSent: emailResult.sent,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: updated.count === 0,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
