import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, takeoff, quoteRules } = body;

  const system = `
You are an AI quoting agent for windows and doors.
You must answer using only the provided TAKEOFF JSON and QUOTE RULES.
If you do not have enough information, ask a specific clarifying question.
Do not invent measurements, counts, brands, or prices outside the rules.
When you give a number, explain which items you used by id.
  `.trim();

  const context = `
TAKEOFF_JSON:
${JSON.stringify(takeoff, null, 2)}

QUOTE_RULES:
${JSON.stringify(quoteRules, null, 2)}
  `.trim();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "system", content: context },
      ...(messages || [])
    ],
    temperature: 0.2
  });

  return Response.json({ reply: completion.choices[0]?.message?.content ?? "" });
}
