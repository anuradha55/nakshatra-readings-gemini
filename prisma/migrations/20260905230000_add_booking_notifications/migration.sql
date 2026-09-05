CREATE TYPE "BookingNotificationType" AS ENUM (
  'CUSTOMER_PAYMENT_CONFIRMATION',
  'ASTROLOGER_NEW_BOOKING'
);

CREATE TYPE "BookingNotificationStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "BookingNotification" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "type" "BookingNotificationType" NOT NULL,
  "status" "BookingNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "twilioSid" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingNotification_twilioSid_key" UNIQUE ("twilioSid"),
  CONSTRAINT "BookingNotification_bookingId_type_key" UNIQUE ("bookingId", "type"),
  CONSTRAINT "BookingNotification_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BookingNotification_status_idx"
  ON "BookingNotification" ("status");

CREATE INDEX "BookingNotification_createdAt_idx"
  ON "BookingNotification" ("createdAt");
