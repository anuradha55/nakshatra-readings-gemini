-- Bring the production database in sync with the Booking revenue-split fields.
-- This migration is intentionally safe to run on the existing production database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutStatus') THEN
    CREATE TYPE "PayoutStatus" AS ENUM (
      'NOT_REQUIRED',
      'PENDING',
      'PROCESSING',
      'PAID',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "platformShare" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "astrologerShare" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE INDEX IF NOT EXISTS "Booking_payoutStatus_idx"
  ON "Booking" ("payoutStatus");

CREATE TABLE IF NOT EXISTS "AstrologerPayout" (
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

  CONSTRAINT "AstrologerPayout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AstrologerPayout_bookingId_key" UNIQUE ("bookingId"),
  CONSTRAINT "AstrologerPayout_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AstrologerPayout_status_idx"
  ON "AstrologerPayout" ("status");

CREATE INDEX IF NOT EXISTS "AstrologerPayout_createdAt_idx"
  ON "AstrologerPayout" ("createdAt");
