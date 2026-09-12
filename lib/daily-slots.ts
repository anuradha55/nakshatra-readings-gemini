import { prisma } from "@/lib/prisma";

export const DAILY_SESSION_DAYS = 30;

// 20 sessions per day: 16 x 15-minute sessions and 4 x 60-minute sessions.
// The schedule spans 10:00 AM through 9:00 PM IST.
export const DAILY_SESSION_TEMPLATE = [
  ["10:00", "10:15"],
  ["10:15", "10:30"],
  ["10:30", "10:45"],
  ["10:45", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "12:15"],
  ["12:15", "12:30"],
  ["12:30", "12:45"],
  ["12:45", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "14:15"],
  ["14:15", "14:30"],
  ["14:30", "14:45"],
  ["14:45", "15:00"],
  ["15:00", "16:00"],
  ["17:00", "17:15"],
  ["17:15", "17:30"],
  ["17:30", "17:45"],
  ["17:45", "18:00"],
  ["20:00", "21:00"],
] as const;

function istDateString(offsetDays: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return date.toISOString().slice(0, 10);
}

export async function ensureDailySessions(days = DAILY_SESSION_DAYS) {
  const astrologerEmail = (process.env.ASTROLOGER_EMAILS?.split(",")[0] ?? "").trim().toLowerCase();
  const astrologerName = process.env.ASTROLOGER_NAME?.trim() || "Astrologer";
  if (!astrologerEmail) return { created: 0, skipped: 0, configured: false };

  const dates = Array.from({ length: days }, (_, index) => istDateString(index));
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const rangeStart = new Date(`${firstDate}T00:00:00+05:30`);
  const rangeEnd = new Date(`${lastDate}T23:59:59+05:30`);

  const existing = await prisma.availabilitySlot.findMany({
    where: { astrologerEmail, startsAt: { gte: rangeStart, lte: rangeEnd } },
    select: { startsAt: true, endsAt: true },
  });

  const existingKeys = new Set(existing.map((slot) => `${slot.startsAt.toISOString()}|${slot.endsAt.toISOString()}`));
  const data: Array<{ astrologerEmail: string; astrologerName: string; startsAt: Date; endsAt: Date }> = [];
  const intervals = existing.map((slot) => ({ startsAt: slot.startsAt.getTime(), endsAt: slot.endsAt.getTime() }));

  for (const date of dates) {
    for (const [startTime, endTime] of DAILY_SESSION_TEMPLATE) {
      const startsAt = new Date(`${date}T${startTime}:00+05:30`);
      const endsAt = new Date(`${date}T${endTime}:00+05:30`);
      if (startsAt <= new Date()) continue;

      const key = `${startsAt.toISOString()}|${endsAt.toISOString()}`;
      if (existingKeys.has(key)) continue;

      const overlaps = intervals.some((interval) => interval.startsAt < endsAt.getTime() && interval.endsAt > startsAt.getTime());
      if (overlaps) continue;

      data.push({ astrologerEmail, astrologerName, startsAt, endsAt });
      intervals.push({ startsAt: startsAt.getTime(), endsAt: endsAt.getTime() });
      existingKeys.add(key);
    }
  }

  if (data.length > 0) await prisma.availabilitySlot.createMany({ data });
  return { created: data.length, skipped: days * DAILY_SESSION_TEMPLATE.length - data.length, configured: true };
}
