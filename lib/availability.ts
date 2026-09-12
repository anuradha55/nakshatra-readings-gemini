import { prisma } from "@/lib/prisma";

export const HOLD_MINUTES = 5;

export function slotStatusIsBookable(status: string, holdExpiresAt: Date | null) {
  return status === "AVAILABLE" || (status === "HELD" && !!holdExpiresAt && holdExpiresAt <= new Date());
}

export async function releaseExpiredHolds() {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const expiredSlots = await tx.availabilitySlot.findMany({
      where: { status: "HELD", holdExpiresAt: { lte: now } },
      select: { id: true },
    });

    if (expiredSlots.length === 0) return;

    const slotIds = expiredSlots.map((slot) => slot.id);
    const bookings = await tx.booking.findMany({
      where: { slotId: { in: slotIds } },
      select: { id: true, slotId: true, status: true },
    });

    const paidSlotIds = new Set(
      bookings
        .filter((booking) => booking.status === "PAID" && booking.slotId)
        .map((booking) => booking.slotId as string),
    );

    for (const booking of bookings) {
      if (!booking.slotId || booking.status === "PAID") continue;
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          slotId: null,
          ...(booking.status === "PENDING"
            ? { status: "CANCELLED" as const, payoutStatus: "CANCELLED" as const }
            : {}),
        },
      });
    }

    await tx.availabilitySlot.updateMany({
      where: { id: { in: slotIds }, status: "HELD" },
      data: { status: "AVAILABLE", holdExpiresAt: null },
    });

    if (paidSlotIds.size > 0) {
      await tx.availabilitySlot.updateMany({
        where: { id: { in: Array.from(paidSlotIds) } },
        data: { status: "BOOKED", holdExpiresAt: null },
      });
    }
  });
}

export async function reserveSlot(slotId: string) {
  await releaseExpiredHolds();
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const result = await prisma.availabilitySlot.updateMany({
    where: { id: slotId, status: "AVAILABLE", startsAt: { gt: new Date() } },
    data: { status: "HELD", holdExpiresAt },
  });
  if (result.count !== 1) throw new Error("That appointment slot is no longer available. Please choose another slot.");
  return holdExpiresAt;
}

export async function bookSlot(slotId: string, bookingId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new Error("Appointment slot not found.");
    if (slot.status === "BOOKED" || slot.status === "BLOCKED") throw new Error("Appointment slot is no longer available.");
    if (slot.status === "HELD" && slot.holdExpiresAt && slot.holdExpiresAt < new Date()) throw new Error("Appointment slot hold expired.");
    await tx.availabilitySlot.update({ where: { id: slotId }, data: { status: "BOOKED", holdExpiresAt: null } });
    return tx.booking.update({ where: { id: bookingId }, data: { slotId } });
  });
  return result;
}

export async function freeSlotForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { slotId: true } });
  if (!booking?.slotId) return;
  await prisma.availabilitySlot.updateMany({ where: { id: booking.slotId, status: "HELD" }, data: { status: "AVAILABLE", holdExpiresAt: null } });
}
