import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { BookingNotificationStatus } from "@/app/generated/prisma/client";

export const runtime = "nodejs";

function validateTwilioSignature(requestUrl: string, params: Record<string, string>, signature: string, authToken: string) {
  const data = requestUrl + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join("");
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("TWILIO_STATUS_ERROR: TWILIO_AUTH_TOKEN is not configured");
      return NextResponse.json({ error: "Twilio is not configured." }, { status: 500 });
    }

    const form = await request.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => {
      params[key] = String(value);
    });

    const signature = request.headers.get("x-twilio-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Twilio signature." }, { status: 403 });
    }

    if (!validateTwilioSignature(request.url, params, signature, authToken)) {
      return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
    }

    const sid = params.MessageSid;
    const status = params.MessageStatus?.toLowerCase();
    if (!sid) return NextResponse.json({ received: true });

    const delivered = status === "delivered";
    const failed = status === "failed" || status === "undelivered";

    if (delivered) {
      await prisma.bookingNotification.updateMany({
        where: { twilioSid: sid },
        data: {
          status: BookingNotificationStatus.DELIVERED,
          deliveredAt: new Date(),
          lastError: null,
        },
      });
    } else if (failed) {
      await prisma.bookingNotification.updateMany({
        where: { twilioSid: sid },
        data: {
          status: BookingNotificationStatus.FAILED,
          lastError: params.ErrorMessage || params.ErrorCode || `Twilio status: ${status}`,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("TWILIO_STATUS_ERROR", error);
    return NextResponse.json({ error: "Twilio status processing failed." }, { status: 500 });
  }
}
