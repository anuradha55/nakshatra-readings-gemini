import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processBookingNotifications } from "@/lib/booking-notifications";
import { BookingNotificationStatus } from "@/app/generated/prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("NOTIFICATION_CRON_ERROR: CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    const notifications = await prisma.bookingNotification.findMany({
      where: {
        OR: [
          { status: BookingNotificationStatus.PENDING },
          { status: BookingNotificationStatus.FAILED },
          {
            status: BookingNotificationStatus.PROCESSING,
            updatedAt: { lt: staleBefore },
          },
        ],
      },
      select: { bookingId: true },
      distinct: ["bookingId"],
      take: 25,
    });

    let processed = 0;
    for (const notification of notifications) {
      await processBookingNotifications(notification.bookingId);
      processed += 1;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("NOTIFICATION_CRON_ERROR", error);
    return NextResponse.json({ error: "Notification retry failed." }, { status: 500 });
  }
}
