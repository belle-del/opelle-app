import { NextResponse } from "next/server";
import { createProduct, listProducts, searchProducts } from "@/lib/db/products";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const products = query ? await searchProducts(query) : await listProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to list products:", error);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.brand || !body.shade || !body.category) {
      return NextResponse.json(
        { error: "Brand, shade, and category are required" },
        { status: 400 }
      );
    }

    const product = await createProduct({
      brand: body.brand,
      shade: body.shade,
      category: body.category,
      line: body.line,
      name: body.name,
      sizeOz: body.sizeOz,
      sizeGrams: body.sizeGrams,
      costCents: body.costCents,
      barcode: body.barcode,
      quantity: body.quantity,
      lowStockThreshold: body.lowStockThreshold,
      notes: body.notes,
    });

    if (!product) {
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
