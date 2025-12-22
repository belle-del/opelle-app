import { NextResponse } from "next/server";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
  const env = process.env.VERCEL_ENV ?? "local";

  return NextResponse.json({
    ok: true,
    app: "opelle",
    time: new Date().toISOString(),
    commit,
    env,
  });
}
