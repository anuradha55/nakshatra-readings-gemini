CREATE TYPE "AvailabilitySlotStatus" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED');

CREATE TABLE "AvailabilitySlot" (
  "id" TEXT NOT NULL,
  "astrologerEmail" TEXT NOT NULL,
  "astrologerName" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "AvailabilitySlotStatus" NOT NULL DEFAULT 'AVAILABLE',
  "holdExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "slotId" TEXT;

CREATE UNIQUE INDEX "Booking_slotId_key" ON "Booking"("slotId");
CREATE INDEX "AvailabilitySlot_astrologerEmail_startsAt_idx" ON "AvailabilitySlot"("astrologerEmail", "startsAt");
CREATE INDEX "AvailabilitySlot_status_startsAt_idx" ON "AvailabilitySlot"("status", "startsAt");
CREATE INDEX "AvailabilitySlot_startsAt_endsAt_idx" ON "AvailabilitySlot"("startsAt", "endsAt");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey"
  FOREIGN KEY ("slotId") REFERENCES "AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
