import { NextResponse } from "next/server";
import { getProduct, updateProduct, deleteProduct } from "@/lib/db/products";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to get product:", error);
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const product = await updateProduct(id, {
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
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteProduct(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
