import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { getKundli, Observer } from "@prisri/jyotish";

export const runtime = "nodejs";

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function formatDate(value: unknown) {
  if (!value) return "Unknown";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDegree(degree: number, minute: number, second: number) {
  return `${degree}° ${minute}' ${second}"`;
}

function getCurrentPeriodLabel(period: any) {
  if (!period?.planet) return "Not available";
  return `${period.planet} (${formatDate(period.startTime)} – ${formatDate(period.endTime)})`;
}

async function geocodeBirthPlace(place: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", place);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetch(url.toString(), { headers: { "User-Agent": "NakshatraReadings/1.0" }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to locate the birth place.");
  const data = await response.json();
  const result = data?.results?.[0];
  if (result?.latitude == null || result?.longitude == null) throw new Error(`Birth place could not be located: ${place}`);
  return {
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    timezone: String(result.timezone || "UTC"),
    resolvedName: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
  };
}

function localTimeToUtc(dateText: string, timeText: string, timeZone: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error("Invalid birth date or birth time.");
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(naiveUtc)).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return new Date(naiveUtc - (asUtc - naiveUtc));
}

function buildChartSummary(kundli: any) {
  const planets = PLANET_ORDER.map((name) => {
    const p = kundli.planets?.[name];
    if (!p) return `${name}: unavailable`;
    const house = kundli.houses?.find((h: any) => h.planets?.includes(name))?.number ?? "?";
    return `${name}: ${p.rashiName} ${formatDegree(p.degree, p.minute, p.second)}, House ${house}, Nakshatra ${p.nakshatra} Pada ${p.pada}, Lord ${p.nakshatraLord}, ${p.isRetrograde ? "retrograde" : "direct"}`;
  }).join("\n");
  const houses = (kundli.houses ?? []).map((h: any) => `House ${h.number}: ${h.planets?.length ? h.planets.join(", ") : "empty"}`).join("\n");
  const currentMaha = kundli.dasha?.currentMahadasha;
  const currentAntar = kundli.dasha?.currentAntar;
  const currentPratyantar = kundli.dasha?.currentPratyantar;
  return `
ASCENDANT
${kundli.ascendant.rashiName} ${formatDegree(kundli.ascendant.degree, kundli.ascendant.minute, kundli.ascendant.second)}; Nakshatra ${kundli.ascendant.nakshatra}, Pada ${kundli.ascendant.pada}; Ascendant Lord ${kundli.ascendant.rashiLord}

MOON / BIRTH NAKSHATRA
Moon: ${kundli.planets.Moon.rashiName} ${formatDegree(kundli.planets.Moon.degree, kundli.planets.Moon.minute, kundli.planets.Moon.second)}; Nakshatra ${kundli.planets.Moon.nakshatra}, Pada ${kundli.planets.Moon.pada}; Nakshatra Lord ${kundli.planets.Moon.nakshatraLord}

PLANETARY POSITIONS
${planets}

HOUSE OCCUPANCY
${houses}

VIMSHOTTARI DASHA
Birth Nakshatra: ${kundli.dasha?.birthNakshatra ?? "Unknown"}, Pada ${kundli.dasha?.nakshatraPada ?? "?"}
Current Mahadasha: ${getCurrentPeriodLabel(currentMaha)}
Current Antardasha: ${getCurrentPeriodLabel(currentAntar)}
Current Pratyantardasha: ${getCurrentPeriodLabel(currentPratyantar)}

MAHADASHA TIMELINE
${(kundli.dasha?.mahadashas ?? []).slice(0, 12).map((d: any) => `${d.planet}: ${formatDate(d.startTime)} – ${formatDate(d.endTime)}`).join("\n")}
`;
}

function buildChartData(kundli: any) {
  return {
    ascendant: {
      sign: String(kundli.ascendant?.rashiName ?? "Unknown"),
      degree: Number(kundli.ascendant?.degree ?? 0),
      minute: Number(kundli.ascendant?.minute ?? 0),
      second: Number(kundli.ascendant?.second ?? 0),
    },
    houses: (kundli.houses ?? []).map((h: any) => ({
      number: Number(h.number),
      sign: String(h.rashiName ?? h.signName ?? h.rashi ?? ""),
      planets: (h.planets ?? []).map((planetName: string) => {
        const p = kundli.planets?.[planetName];
        return {
          name: planetName,
          sign: String(p?.rashiName ?? ""),
          degree: Number(p?.degree ?? 0),
          minute: Number(p?.minute ?? 0),
          second: Number(p?.second ?? 0),
          nakshatra: p?.nakshatra,
          pada: p?.pada,
          retrograde: Boolean(p?.isRetrograde),
        };
      }),
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = clean(body.name, 100);
    const email = clean(body.email, 200).toLowerCase();
    const birthDate = clean(body.birthDate, 30);
    const birthTime = clean(body.birthTime, 30);
    const birthPlace = clean(body.birthPlace, 150);
    const question = clean(body.question, 500);
    if (!email || !email.includes("@") || !birthDate || !birthTime || !birthPlace || !question) {
      return NextResponse.json({ error: "Please provide your email, birth date, birth time, birth place and question." }, { status: 400 });
    }

    const limitSetting = String(process.env.AI_FREE_QUESTIONS ?? "unlimited").trim().toLowerCase();
    const unlimited = limitSetting === "" || limitSetting === "unlimited" || limitSetting === "0";
    const limit = unlimited ? null : Number(limitSetting);
    if (!unlimited && (!Number.isFinite(limit) || (limit as number) < 1)) {
      return NextResponse.json({ error: "AI_FREE_QUESTIONS must be a positive number or 'unlimited'." }, { status: 500 });
    }

    let used = 0;
    if (!unlimited) {
      used = await prisma.aiPrediction.count({ where: { email } });
      if (used >= (limit as number)) return NextResponse.json({ error: "You have used your free AI predictions.", limitReached: true, used, limit }, { status: 429 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";
    if (!apiKey) return NextResponse.json({ error: "Groq AI service is not configured." }, { status: 500 });

    const location = await geocodeBirthPlace(birthPlace);
    const birthInstantUtc = localTimeToUtc(birthDate, birthTime, location.timezone);
    const observer = new Observer(location.latitude, location.longitude, 0);
    const kundli = getKundli(birthInstantUtc, observer, { houseSystem: "whole_sign", ayanamsa: "lahiri" });
    const chartSummary = buildChartSummary(kundli);
    const chart = buildChartData(kundli);

    const groq = new Groq({ apiKey, maxRetries: 0 });

    const systemPrompt = `You are the AI assistant for Nakshatra Readings, a Vedic-astrology consultation website.

You are given a VERIFIED Vedic chart calculated by the application's astrology engine. The chart data, not your own guess, is the source of truth for planetary positions, houses, Nakshatras and Vimshottari Dasha.

Your job is to interpret that chart in a clear, warm and convincing way for a customer who asked a specific question.

MANDATORY RESPONSE STRUCTURE:
## 1. Birth Chart Snapshot
State the Ascendant (Lagna), Ascendant degree, Moon sign, Moon Nakshatra/Pada and the resolved birth place.

## 2. Planetary Positions
Provide a compact table with Planet, Sign, Degree, House and Nakshatra. Include Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu.

## 3. Current Vimshottari Dasha
Clearly state the current Mahadasha, Antardasha and Pratyantardasha if supplied, including their dates.

## 4. Analysis of Your Question
Directly answer the customer's question. Identify the relevant houses, their lords, relevant planets, aspects/placements supplied by the chart and how the current Dasha supports or challenges the matter. Do not invent yogas or aspects that cannot be supported by the supplied chart.

## 5. Practical Outlook
Give 3-5 concise points about likely themes, opportunities and cautions. Use astrology as interpretive guidance, not certainty.

## 6. Conclusion
Give a concise, personalized conclusion that directly answers the question.

RULES:
- Never alter or invent the supplied planetary positions, houses, degrees, Nakshatras or Dasha dates.
- Do not claim that you independently calculated the Kundli; say the chart was calculated from the supplied birth details by the site's astrology engine when relevant.
- Keep the interpretation specific to this customer's chart rather than generic horoscope language.
- Do not make medical, legal or financial guarantees.
- Do not create fear, curses, death predictions or supernatural threats.
- Do not say a paid consultation is required to prevent a bad outcome.
- The reading is an AI-generated astrology interpretation and is not a scientific prediction or guarantee.
- Return the COMPLETE reading. Do not stop after the first few sections and do not omit the planetary table, Dasha, analysis, practical outlook or conclusion.
- Aim for approximately 800-1200 words. Prioritize completeness over brevity.
- End the response only after writing the full Conclusion section.`;

    const userMessage = `CUSTOMER
Name: ${name || "Not provided"}
Birth date: ${birthDate}
Birth time: ${birthTime}
Birth place entered: ${birthPlace}
Resolved place: ${location.resolvedName}
Question: ${question}

CALCULATED VEDIC CHART
${chartSummary}`;

    let response;
    try {
      response = await groq.chat.completions.create({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        // GPT-OSS uses part of the completion budget for reasoning. Use the
        // current Groq parameter name and give the visible answer enough room
        // to finish all six required sections.
        max_completion_tokens: 6000,
        reasoning_effort: "low",
        temperature: 0.35,
      });
    } catch (error) {
      if (error instanceof Groq.APIError && error.status === 429) {
        const retryAfterHeader = error.headers?.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const headers = new Headers({ "Cache-Control": "no-store" });
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) headers.set("Retry-After", String(Math.ceil(retryAfterSeconds)));
        return NextResponse.json({ error: "AI prediction is temporarily unavailable because our AI service has reached its usage limit. Please try again later.", code: "AI_RATE_LIMITED", retryAfterSeconds: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds) : null }, { status: 429, headers });
      }
      if (error instanceof Groq.APIError) {
        console.error("GROQ_API_ERROR", { status: error.status, name: error.name, message: error.message });
        return NextResponse.json({ error: "The AI service could not generate your prediction right now. Please try again later." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
      throw error;
    }

    const choice = response.choices[0];
    const answer = choice?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "No prediction was generated. Please try again." }, { status: 502 });

    if (choice?.finish_reason === "length") {
      console.warn("AI_PREDICTION_TRUNCATED", {
        finishReason: choice.finish_reason,
        completionTokens: response.usage?.completion_tokens,
        model,
      });
    }

    try {
      await prisma.aiPrediction.create({ data: { email, name: name || null, birthDate, birthTime, birthPlace, question, answer, model } });
    } catch (databaseError) {
      console.error("AI_PREDICTION_SAVE_ERROR", databaseError);
    }

    return NextResponse.json({ success: true, answer, chart, used: unlimited ? null : used + 1, remaining: unlimited ? null : Math.max(0, (limit as number) - used - 1) });
  } catch (error) {
    console.error("AI_PREDICTION_ERROR", error);
    const message = error instanceof Error ? error.message : "Unable to generate your prediction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
