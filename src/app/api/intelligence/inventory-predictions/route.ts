import { NextResponse } from "next/server";
import { getInventoryPredictions } from "@/lib/kernel";
import { listProducts } from "@/lib/db/products";
import { listAllFormulaEntries } from "@/lib/db/formula-entries";

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export async function POST() {
  try {
    const [products, formulaEntries] = await Promise.all([
      listProducts(),
      listAllFormulaEntries(),
    ]);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products in inventory" },
        { status: 404 }
      );
    }

    // Extract product usage from parsed formulas
    const usageHistory: {
      productId: string;
      brand: string;
      shade: string;
      amountUsed?: string;
      serviceDate: string;
    }[] = [];

    for (const entry of formulaEntries) {
      if (!entry.parsedFormula?.bowls) continue;
      for (const bowl of entry.parsedFormula.bowls) {
        for (const product of bowl.products) {
          // Match parsed product to inventory by shade + brand
          const matched = products.find((p) => {
            const shadeMatch = normalize(p.shade) === normalize(product.name);
            if (!product.brand) return shadeMatch;
            return shadeMatch && normalize(p.brand) === normalize(product.brand);
          });

          usageHistory.push({
            productId: matched?.id ?? "",
            brand: product.brand ?? matched?.brand ?? "Unknown",
            shade: product.name ?? "Unknown",
            amountUsed: product.amount ?? undefined,
            serviceDate: entry.serviceDate,
          });
        }
      }
    }

    // Calculate date range
    const serviceDates = formulaEntries
      .map((e) => e.serviceDate)
      .filter(Boolean)
      .sort();

    const dateRange = {
      earliest: serviceDates[0] ?? new Date().toISOString().split("T")[0],
      latest: serviceDates[serviceDates.length - 1] ?? new Date().toISOString().split("T")[0],
    };

    const result = await getInventoryPredictions({
      products: products.map((p) => ({
        id: p.id,
        brand: p.brand,
        shade: p.shade,
        line: p.line,
        category: p.category,
        quantity: p.quantity,
        sizeOz: p.sizeOz,
        costCents: p.costCents,
        lowStockThreshold: p.lowStockThreshold,
        avgUsageOzPerAppointment: p.enrichment?.avgUsageOzPerAppointment,
      })),
      usageHistory: usageHistory.slice(0, 500),
      totalFormulaEntries: formulaEntries.length,
      dateRange,
    });

    if (!result) {
      return NextResponse.json(
        { error: "No predictions available" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("Failed to get inventory predictions:", error);
    return NextResponse.json(
      { error: "Failed to get predictions" },
      { status: 500 }
    );
  }
}
