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

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = `nr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const order = await razorpay.orders.create({
      amount: 50000,
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
