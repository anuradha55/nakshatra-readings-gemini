import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { birthDate, birthTime, birthPlace } = await request.json();
    if (!birthDate || !birthTime || !birthPlace) {
      return NextResponse.json({ error: "Birth details are required." }, { status: 400 });
    }

    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", String(birthPlace));
    geoUrl.searchParams.set("count", "1");
    geoUrl.searchParams.set("format", "json");
    const geoResponse = await fetch(geoUrl, { cache: "no-store" });
    const geoData = await geoResponse.json();
    const place = geoData?.results?.[0];
    if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return NextResponse.json({ error: "Unable to validate the birth place." }, { status: 400 });
    }
    const birthPlaceKey = Number(place.latitude).toFixed(4) + ":" + Number(place.longitude).toFixed(4);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
    }

    const amount = Number(process.env.AI_PREDICTION_AMOUNT ?? "1000");
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid AI_PREDICTION_AMOUNT configuration." }, { status: 500 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "ai_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      notes: { product: "ai_prediction" },
    });

    const payment = await prisma.aiPredictionPayment.create({
      data: {
        birthDate,
        birthTime,
        birthPlaceKey,
        amount: Number(order.amount),
        currency: order.currency,
        razorpayOrderId: order.id,
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("AI_PREDICTION_CREATE_ORDER_ERROR", error);
    return NextResponse.json({ error: "Unable to start AI prediction payment." }, { status: 500 });
  }
}
