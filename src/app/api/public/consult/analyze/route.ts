import { NextRequest, NextResponse } from "next/server";
import { analyzeInspoDirect } from "@/lib/ai/inspo-analysis";

// Allow up to 60s for Claude vision analysis.
export const maxDuration = 60;

const ALLOWED_ORIGINS = new Set<string>([
  "https://belle.co.beauty",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403, headers: corsHeaders(origin) });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// Photos-only analyze endpoint. The v2 belle.co.beauty form calls this
// after photos are uploaded so the user sees per-photo questions populate
// before they finish the rest of the form. Nothing is persisted here. The
// final submit goes to /api/public/consult, which re-runs analysis and
// stores the results.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  try {
    const formData = await request.formData();

    const photoFiles: File[] = [];
    for (let i = 0; i < 12; i++) {
      const value = formData.get(`photo${i}`);
      if (value instanceof File && value.size > 0) {
        photoFiles.push(value);
      }
    }

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400, headers }
      );
    }

    const images: { mediaType: string; base64: string }[] = [];
    for (const file of photoFiles) {
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      images.push({
        mediaType: file.type || "image/jpeg",
        base64: buffer.toString("base64"),
      });
    }

    const result = await analyzeInspoDirect({
      images,
      clientNotes: null,
      clientContext: null,
      formulaHistory: null,
    });

    return NextResponse.json(
      {
        success: true,
        perPhotoQuestions: result.questions,
        clientSummary: result.clientSummary,
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error("[public/consult/analyze] Crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500, headers }
    );
  }
}
