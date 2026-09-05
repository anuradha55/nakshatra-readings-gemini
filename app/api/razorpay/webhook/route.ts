import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { processBookingNotifications } from "@/lib/booking-notifications";

export const runtime = "nodejs";

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_ERROR: RAZORPAY_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });
    }

    const rawBody = await request.text();
    const receivedSignature = request.headers.get("x-razorpay-signature");
    if (!receivedSignature) {
      return NextResponse.json({ error: "Missing Razorpay webhook signature." }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (!safeCompare(expectedSignature, receivedSignature)) {
      console.warn("RAZORPAY_WEBHOOK_ERROR: Invalid signature");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const eventId = request.headers.get("x-razorpay-event-id");
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            currency?: string;
          };
        };
        order?: {
          entity?: {
            id?: string;
            amount?: number;
            amount_paid?: number;
            currency?: string;
          };
        };
      };
    };

    console.log("RAZORPAY_WEBHOOK_RECEIVED", { eventId, event: event.event });

    if (event.event !== "payment.captured" && event.event !== "order.paid") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const razorpayOrderId = payment?.order_id ?? order?.id;
    const razorpayPaymentId = payment?.id;
    const amount = payment?.amount ?? order?.amount_paid ?? order?.amount;
    const currency = payment?.currency ?? order?.currency;

    if (!razorpayOrderId) {
      return NextResponse.json({ error: "Webhook does not contain a Razorpay order ID." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { razorpayOrderId } });
    if (!booking) {
      console.warn("RAZORPAY_WEBHOOK_UNKNOWN_ORDER", { razorpayOrderId, eventId });
      return NextResponse.json({ received: true, ignored: true });
    }

    if (typeof amount !== "number" || amount !== booking.amount || currency !== booking.currency) {
      console.error("RAZORPAY_WEBHOOK_AMOUNT_MISMATCH", {
        bookingId: booking.id,
        razorpayOrderId,
        expectedAmount: booking.amount,
        receivedAmount: amount,
        expectedCurrency: booking.currency,
        receivedCurrency: currency,
      });
      return NextResponse.json({ error: "Payment amount or currency mismatch." }, { status: 400 });
    }

    if (event.event === "payment.captured" && !razorpayPaymentId) {
      return NextResponse.json({ error: "Captured payment webhook is missing payment ID." }, { status: 400 });
    }

    if (booking.status !== "PAID") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "PAID",
          ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
          paymentVerifiedAt: booking.paymentVerifiedAt ?? new Date(),
        },
      });
    } else if (
      razorpayPaymentId &&
      booking.razorpayPaymentId &&
      booking.razorpayPaymentId !== razorpayPaymentId
    ) {
      console.error("RAZORPAY_WEBHOOK_PAYMENT_ID_MISMATCH", {
        bookingId: booking.id,
        existingPaymentId: booking.razorpayPaymentId,
        receivedPaymentId: razorpayPaymentId,
        eventId,
      });
      return NextResponse.json({ error: "Booking is already associated with a different payment." }, { status: 409 });
    }

    // Notification processing is idempotent. The database record is created once
    // per notification type, and a conditional claim prevents concurrent webhooks
    // from sending the same SMS twice.
    await processBookingNotifications(booking.id);

    console.log("RAZORPAY_WEBHOOK_BOOKING_PAID", {
      bookingId: booking.id,
      email: booking.email,
      razorpayOrderId,
      razorpayPaymentId,
      eventId,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("RAZORPAY_WEBHOOK_ERROR", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
