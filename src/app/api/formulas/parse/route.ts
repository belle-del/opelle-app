import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a hair color formula parser for professional stylists. Your job is to take freeform notes about hair color formulations and parse them into structured JSON.

Given raw notes like "2 oz of 8.6n and 2 of 7.6n with 4 oz of 10 vol" or "bowl 1: shades eq 8n 1oz + 9gi 1oz with processing solution. 35 min. Bowl 2: redken flash lift + 30vol 1:2", extract and organize into bowls.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "bowls": [
    {
      "label": "Bowl 1",
      "products": [
        { "name": "8.6N", "amount": "2 oz", "brand": "" }
      ],
      "developer": { "volume": "10vol", "amount": "4 oz" },
      "processingTime": "35 min",
      "applicationNotes": ""
    }
  ]
}

Rules:
- Each distinct mix/bowl should be a separate bowl entry
- If no separate bowls mentioned, group everything into "Bowl 1"
- Normalize shade names to uppercase (e.g., "8.6n" -> "8.6N")
- Normalize developer volumes (e.g., "10 vol" -> "10vol", "twenty volume" -> "20vol")
- If a brand is mentioned (Redken, Wella, Schwarzkopf, etc.), include it
- If processing time is mentioned, include it
- Omit fields that are empty — don't include empty strings, use null or omit
- applicationNotes is for placement/technique info (e.g., "roots to midshaft", "foils on crown")
- If notes are unclear, do your best to parse what's there
- ONLY return JSON, no other text`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.rawNotes?.trim()) {
      return NextResponse.json({ error: "rawNotes is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: body.rawNotes.trim(),
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    const parsed = JSON.parse(textBlock.text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to parse formula:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse formula" },
      { status: 500 }
    );
  }
}
