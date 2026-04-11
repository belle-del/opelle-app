import { NextResponse } from "next/server";
import { getSpecialties } from "@/lib/db/network";

export async function GET() {
  try {
    const specialties = await getSpecialties();
    return NextResponse.json({ specialties });
  } catch (err) {
    console.error("Get specialties error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
