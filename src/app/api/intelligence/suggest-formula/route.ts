import { NextResponse } from "next/server";
import { getFormulaSuggestion } from "@/lib/kernel";
import { getClient } from "@/lib/db/clients";
import { getFormulaEntriesForClient } from "@/lib/db/formula-entries";
import { listProducts } from "@/lib/db/products";
import { getClientDisplayName } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { clientId, serviceTypeName } = await request.json();

    if (!clientId || !serviceTypeName) {
      return NextResponse.json(
        { error: "clientId and serviceTypeName are required" },
        { status: 400 }
      );
    }

    const [client, formulaEntries, products] = await Promise.all([
      getClient(clientId),
      getFormulaEntriesForClient(clientId),
      listProducts(),
    ]);

    if (!client || formulaEntries.length < 2) {
      return NextResponse.json(
        { error: "No suggestion available — not enough history yet" },
        { status: 404 }
      );
    }

    // Build product catalog so the AI only references products we carry
    const productCatalog = products.length > 0
      ? products.map((p) => `${p.brand || ""} ${p.line || ""} ${p.shade || ""} ${p.name || ""}`.trim()).filter(Boolean)
      : null;

    const suggestion = await getFormulaSuggestion({
      clientName: getClientDisplayName(client),
      serviceTypeName,
      formulaHistory: formulaEntries.slice(0, 20).map((fe) => ({
        service_date: fe.serviceDate,
        raw_notes: fe.rawNotes,
        general_notes: fe.generalNotes,
        parsed_formula: fe.parsedFormula,
      })),
      clientPreferences: client.preferenceProfile ?? null,
      productCatalog,
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Metis couldn't generate a suggestion right now — the intelligence service may be temporarily unavailable." },
        { status: 503 }
      );
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Failed to get formula suggestion:", error);
    return NextResponse.json(
      { error: "Failed to get suggestion" },
      { status: 500 }
    );
  }
}
