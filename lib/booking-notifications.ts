import { prisma } from "@/lib/prisma";
import {
  sendAstrologerBookingSms,
  sendCustomerBookingSms,
} from "@/lib/twilio";
import {
  BookingNotificationStatus,
  BookingNotificationType,
} from "@/app/generated/prisma/client";

const STALE_PROCESSING_MS = 10 * 60 * 1000;

export async function ensureBookingNotifications(bookingId: string) {
  await prisma.bookingNotification.createMany({
    data: [
      {
        bookingId,
        type: BookingNotificationType.CUSTOMER_PAYMENT_CONFIRMATION,
      },
      {
        bookingId,
        type: BookingNotificationType.ASTROLOGER_NEW_BOOKING,
      },
    ],
    skipDuplicates: true,
  });
}

export async function processBookingNotifications(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PAID") return;

  await ensureBookingNotifications(bookingId);

  const notifications = await prisma.bookingNotification.findMany({
    where: {
      bookingId,
      OR: [
        { status: BookingNotificationStatus.PENDING },
        { status: BookingNotificationStatus.FAILED },
        {
          status: BookingNotificationStatus.PROCESSING,
          updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  for (const notification of notifications) {
    const claimed = await prisma.bookingNotification.updateMany({
      where: {
        id: notification.id,
        OR: [
          { status: BookingNotificationStatus.PENDING },
          { status: BookingNotificationStatus.FAILED },
          {
            status: BookingNotificationStatus.PROCESSING,
            updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) },
          },
        ],
      },
      data: {
        status: BookingNotificationStatus.PROCESSING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (claimed.count !== 1) continue;

    try {
      const result =
        notification.type === BookingNotificationType.CUSTOMER_PAYMENT_CONFIRMATION
          ? await sendCustomerBookingSms({
              id: booking.id,
              name: booking.name,
              phone: booking.phone,
              service: booking.service,
              amount: booking.amount,
            })
          : await sendAstrologerBookingSms({
              id: booking.id,
              name: booking.name,
              phone: booking.phone,
              email: booking.email,
              service: booking.service,
              birthDetails: booking.birthDetails,
              amount: booking.amount,
            });

      if (!result.sent) {
        await prisma.bookingNotification.update({
          where: { id: notification.id },
          data: {
            status: BookingNotificationStatus.FAILED,
            lastError: result.error ?? "SMS was not accepted by Twilio.",
          },
        });
        continue;
      }

      await prisma.bookingNotification.update({
        where: { id: notification.id },
        data: {
          status: BookingNotificationStatus.SENT,
          twilioSid: result.sid,
          sentAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.bookingNotification.update({
        where: { id: notification.id },
        data: {
          status: BookingNotificationStatus.FAILED,
          lastError: message,
        },
      });
    }
  }
}
