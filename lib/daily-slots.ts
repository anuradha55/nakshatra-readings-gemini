import { prisma } from "@/lib/prisma";

export const DAILY_SESSION_DAYS = 30;

// 46 sessions per day: 42 x 10-minute sessions and 4 x 60-minute sessions.
// The schedule spans 10:00 AM through 9:00 PM IST, with the existing 1-hour
// sessions kept at 11:00 AM, 1:00 PM, 3:00 PM and 8:00 PM.
export const DAILY_SESSION_TEMPLATE = [
  ["10:00", "10:10"],
  ["10:10", "10:20"],
  ["10:20", "10:30"],
  ["10:30", "10:40"],
  ["10:40", "10:50"],
  ["10:50", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "12:10"],
  ["12:10", "12:20"],
  ["12:20", "12:30"],
  ["12:30", "12:40"],
  ["12:40", "12:50"],
  ["12:50", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "14:10"],
  ["14:10", "14:20"],
  ["14:20", "14:30"],
  ["14:30", "14:40"],
  ["14:40", "14:50"],
  ["14:50", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "16:10"],
  ["16:10", "16:20"],
  ["16:20", "16:30"],
  ["16:30", "16:40"],
  ["16:40", "16:50"],
  ["16:50", "17:00"],
  ["17:00", "17:10"],
  ["17:10", "17:20"],
  ["17:20", "17:30"],
  ["17:30", "17:40"],
  ["17:40", "17:50"],
  ["17:50", "18:00"],
  ["18:00", "18:10"],
  ["18:10", "18:20"],
  ["18:20", "18:30"],
  ["18:30", "18:40"],
  ["18:40", "18:50"],
  ["18:50", "19:00"],
  ["19:00", "19:10"],
  ["19:10", "19:20"],
  ["19:20", "19:30"],
  ["19:30", "19:40"],
  ["19:40", "19:50"],
  ["19:50", "20:00"],
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
