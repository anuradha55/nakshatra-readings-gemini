import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const chunks: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
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
    if (!email || !email.includes("@") || !birthDate || !birthTime || !birthPlace || !question) return NextResponse.json({ error: "Please provide your email, birth date, birth time, birth place and question." }, { status: 400 });
    const limit = Number(process.env.AI_FREE_QUESTIONS ?? 2);
    const used = await prisma.aiPrediction.count({ where: { email } });
    if (used >= limit) return NextResponse.json({ error: "You have used your free AI predictions.", limitReached: true, used, limit }, { status: 429 });
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-3.7-flash";

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini AI service is not configured." }, { status: 500 });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the AI assistant for Nakshatra Readings, a Vedic-astrology consultation website.

Give a warm, concise, engaging astrology-style interpretation based on the customer's supplied birth details and question.

Rules:
- Clearly frame the result as an AI-generated astrology interpretation, not a scientific prediction or guaranteed future event.
- Do not claim to have calculated exact planetary degrees, houses, nakshatras, dashas, ascendant, or transits unless those values are explicitly supplied in the input.
- Do not invent exact astronomical placements.
- Avoid medical, legal, financial, or other high-stakes certainty. If the question is high-stakes, give general reflective guidance and recommend a qualified professional.
- Do not create fear, threats, curses, death predictions, or claims that a supernatural entity will harm the customer.
- Do not say that a paid consultation is required to avoid a bad outcome.
- Keep the answer around 180-300 words.
- Use headings and 3-5 useful bullet points when appropriate.
- End with a gentle invitation to book a ₹500 human consultation for a deeper, personalized reading.
`;

    const input = `
Customer name: ${name || "Not provided"}
Birth date: ${birthDate}
Birth time: ${birthTime}
Birth place: ${birthPlace}
Question: ${question}
`;

    const response = await ai.models.generateContent({
      model,
      contents: input,
      config: {
        systemInstruction,
        maxOutputTokens: 500,
      },
    });

    const answer = response.text?.trim();
    if (!answer) {
      return NextResponse.json({ error: "No prediction was generated. Please try again." }, { status: 502 });
    }

    await prisma.aiPrediction.create({ data: { email, name: name || null, birthDate, birthTime, birthPlace, question, answer, model } });
    return NextResponse.json({ success: true, answer, used: used + 1, remaining: Math.max(0, limit - used - 1) });
  } catch (error) { console.error("AI_PREDICTION_ERROR", error); return NextResponse.json({ error: "Unable to generate your prediction." }, { status: 500 }); }
}
