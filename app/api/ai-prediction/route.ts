import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

export const runtime = "nodejs";

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

    if (
      !email ||
      !email.includes("@") ||
      !birthDate ||
      !birthTime ||
      !birthPlace ||
      !question
    ) {
      return NextResponse.json(
        { error: "Please provide your email, birth date, birth time, birth place and question." },
        { status: 400 }
      );
    }

    const limit = Number(process.env.AI_FREE_QUESTIONS ?? 2);
    const used = await prisma.aiPrediction.count({ where: { email } });

    if (used >= limit) {
      return NextResponse.json(
        {
          error: "You have used your free AI predictions.",
          limitReached: true,
          used,
          limit,
        },
        { status: 429 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL ?? "mixtral-8x7b-32768";

    if (!apiKey) {
      console.error("GROQ_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Groq AI service is not configured." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are the AI assistant for Nakshatra Readings, a Vedic-astrology consultation website.

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
- End with a gentle invitation to book a ₹500 human consultation for a deeper, personalized reading.`;

    const userMessage = `Customer name: ${name || "Not provided"}
Birth date: ${birthDate}
Birth time: ${birthTime}
Birth place: ${birthPlace}
Question: ${question}`;

    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "No prediction was generated. Please try again." },
        { status: 502 }
      );
    }

    await prisma.aiPrediction.create({
      data: {
        email,
        name: name || null,
        birthDate,
        birthTime,
        birthPlace,
        question,
        answer,
        model,
      },
    });

    return NextResponse.json({
      success: true,
      answer,
      used: used + 1,
      remaining: Math.max(0, limit - used - 1),
    });
  } catch (error) {
    console.error("AI_PREDICTION_ERROR", error);
    return NextResponse.json(
      { error: "Unable to generate your prediction." },
      { status: 500 }
    );
  }
}
