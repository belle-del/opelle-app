import { NextResponse } from "next/server";
import { getProductByBarcode } from "@/lib/db/products";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Barcode code is required" }, { status: 400 });
    }

    const product = await getProductByBarcode(code);

    if (!product) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, product });
  } catch (error) {
    console.error("Failed to lookup barcode:", error);
    return NextResponse.json({ error: "Failed to lookup barcode" }, { status: 500 });
  }
}
