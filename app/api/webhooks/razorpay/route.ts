import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendAstrologerBookingSms, sendCustomerBookingSms } from "@/lib/twilio";

export const runtime = "nodejs";

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8")
  );
}


export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventName = String(event?.event ?? "");

    if (eventName !== "order.paid" && eventName !== "payment.captured") {
      // Acknowledge other Razorpay events so they are not retried unnecessarily.
      return NextResponse.json({ received: true, ignored: true });
    }

    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const orderId = String(paymentEntity?.order_id ?? orderEntity?.id ?? "");
    const paymentId = String(paymentEntity?.id ?? "");

    if (!orderId) {
      console.error("RAZORPAY_WEBHOOK_MISSING_ORDER_ID", eventName);
      return NextResponse.json({ error: "Missing Razorpay order ID." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { razorpayOrderId: orderId },
      include: { payout: true },
    });

    if (!booking) {
      console.error("RAZORPAY_WEBHOOK_BOOKING_NOT_FOUND", { orderId, eventName });
      // Returning 200 prevents repeated delivery for an order that does not belong to this app.
      return NextResponse.json({ received: true, bookingFound: false });
    }

    // Idempotent processing: repeated Razorpay deliveries must never create a second payout.
    let newlyMarkedPaid = false;
    if (booking.status !== "PAID") {
      await prisma.$transaction(async (tx) => {
        const paymentUpdate = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: { not: "PAID" },
          },
          data: {
            status: "PAID",
            razorpayPaymentId: paymentId || booking.razorpayPaymentId,
            paymentVerifiedAt: new Date(),
            payoutStatus: "PENDING",
          },
        });
        newlyMarkedPaid = paymentUpdate.count > 0;

        await tx.astrologerPayout.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            astrologerName: process.env.ASTROLOGER_NAME ?? "Astrologer",
            astrologerEmail: process.env.ASTROLOGER_EMAIL ?? "",
            grossAmount: booking.amount,
            platformAmount: booking.platformShare,
            payoutAmount: booking.astrologerShare,
            status: "PENDING",
          },
          update: {},
        });
      });
    } else if (!booking.payout) {
      await prisma.astrologerPayout.create({
        data: {
          bookingId: booking.id,
          astrologerName: process.env.ASTROLOGER_NAME ?? "Astrologer",
          astrologerEmail: process.env.ASTROLOGER_EMAIL ?? "",
          grossAmount: booking.amount,
          platformAmount: booking.platformShare,
          payoutAmount: booking.astrologerShare,
          status: "PENDING",
        },
      });
    }

    const payout = await prisma.astrologerPayout.findUnique({
      where: { bookingId: booking.id },
    });

    if (payout && !payout.notificationSentAt) {
      const sent = (await sendAstrologerBookingSms({
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        service: booking.service,
        birthDetails: booking.birthDetails,
        amount: booking.amount,
      })).sent;
      if (sent) {
        await prisma.astrologerPayout.update({
          where: { id: payout.id },
          data: { notificationSentAt: new Date() },
        });
      }
    }

    if (newlyMarkedPaid) {
      const customerResult = await sendCustomerBookingSms({
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        service: booking.service,
        amount: booking.amount,
      });

      if (!customerResult.sent) {
        console.error("CUSTOMER_SMS_ERROR", {
          bookingId: booking.id,
          phone: booking.phone,
          error: customerResult.error ?? null,
        });
      }
    }

    console.log("RAZORPAY_PAYMENT_PROCESSED", {
      event: eventName,
      bookingId: booking.id,
      orderId,
      paymentId,
      grossAmount: booking.amount,
      platformShare: booking.platformShare,
      astrologerShare: booking.astrologerShare,
    });

    return NextResponse.json({ received: true, success: true });
  } catch (error) {
    console.error("RAZORPAY_WEBHOOK_ERROR", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
