import { NextResponse } from "next/server";

export async function GET() {
  const debugInfo = {
    KERNEL_ENABLED: process.env.KERNEL_ENABLED,
    KERNEL_AUTH_KEY_set: !!process.env.KERNEL_AUTH_KEY,
    KERNEL_AUTH_KEY_length: (process.env.KERNEL_AUTH_KEY || "").length,
    KERNEL_API_KEY_set: !!process.env.KERNEL_API_KEY,
    KERNEL_API_KEY_length: (process.env.KERNEL_API_KEY || "").length,
    KERNEL_API_URL: process.env.KERNEL_API_URL,
    KERNEL_WEBHOOK_URL: process.env.KERNEL_WEBHOOK_URL,
    all_kernel_vars: Object.keys(process.env).filter(k => k.includes("KERNEL")),
  };
  return NextResponse.json(debugInfo);
}
