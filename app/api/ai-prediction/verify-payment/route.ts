import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_signature, paymentId } = await request.json();
    if (!razorpay_payment_id || !razorpay_signature || !paymentId) {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay secret is not configured." }, { status: 500 });

    const payment = await prisma.aiPredictionPayment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });

    const expected = crypto.createHmac("sha256", secret)
      .update(payment.razorpayOrderId + "|" + razorpay_payment_id)
      .digest("hex");

    if (expected.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    await prisma.aiPredictionPayment.update({
      where: { id: paymentId },
      data: { status: "PAID", razorpayPaymentId: razorpay_payment_id, paidAt: new Date() },
    });

    return NextResponse.json({ success: true, paymentId });
  } catch (error) {
    console.error("AI_PREDICTION_VERIFY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: "AI prediction payment verification failed." }, { status: 500 });
  }
}
