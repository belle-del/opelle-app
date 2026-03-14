import { NextResponse } from "next/server";
import { parseFormula } from "@/lib/kernel";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.rawNotes?.trim()) {
      return NextResponse.json({ error: "rawNotes is required" }, { status: 400 });
    }

    const result = await parseFormula(body.rawNotes.trim());

    if (!result?.success || !result.parsed) {
      return NextResponse.json(
        { error: "Formula parsing failed" },
        { status: 502 }
      );
    }

    return NextResponse.json(result.parsed);
  } catch (error) {
    console.error("Failed to parse formula:", error);
    return NextResponse.json(
      { error: "Failed to parse formula" },
      { status: 500 }
    );
  }
}
