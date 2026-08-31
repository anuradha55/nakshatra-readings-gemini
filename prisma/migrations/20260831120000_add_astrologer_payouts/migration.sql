-- Revenue split and payout tracking for human astrology bookings.

CREATE TYPE "PayoutStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

ALTER TABLE "Booking"
  ADD COLUMN "platformShare" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "astrologerShare" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE TABLE "AstrologerPayout" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "astrologerName" TEXT NOT NULL,
  "astrologerEmail" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL,
  "platformAmount" INTEGER NOT NULL,
  "payoutAmount" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "payoutId" TEXT,
  "reference" TEXT,
  "failureReason" TEXT,
  "notificationSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),

  CONSTRAINT "AstrologerPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AstrologerPayout_bookingId_key" ON "AstrologerPayout"("bookingId");
CREATE INDEX "AstrologerPayout_status_idx" ON "AstrologerPayout"("status");
CREATE INDEX "AstrologerPayout_createdAt_idx" ON "AstrologerPayout"("createdAt");

ALTER TABLE "AstrologerPayout"
  ADD CONSTRAINT "AstrologerPayout_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Booking_payoutStatus_idx" ON "Booking"("payoutStatus");
