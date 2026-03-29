import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClient } from "@/lib/db/clients";
import { getFormulaEntriesForClient } from "@/lib/db/formula-entries";
import { listProducts } from "@/lib/db/products";
import { generateInspoFormulaSuggestion, type StylistIntelligence } from "@/lib/ai/inspo-analysis";

// The ai_analysis JSON column has these fields added dynamically
interface StoredAiAnalysis {
  clientSummary?: string;
  generatedFormQuestions?: { id: string; question: string; type: string; options?: string[] }[];
  stylistIntelligence?: StylistIntelligence;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Get client + latest inspo submission with completed answers
    const [client, formulaEntries, products] = await Promise.all([
      getClient(clientId),
      getFormulaEntriesForClient(clientId),
      listProducts(),
    ]);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Find latest inspo submission that has stylist intelligence (meaning client answered questions)
    const { data: inspoSubmissions } = await admin
      .from("inspo_submissions")
      .select("id, client_id, workspace_id, ai_analysis, client_notes, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Find one with stylistIntelligence
    const latestWithIntel = (inspoSubmissions || []).find((sub) => {
      const analysis = sub.ai_analysis as StoredAiAnalysis | null;
      return analysis?.stylistIntelligence;
    });

    if (!latestWithIntel) {
      return NextResponse.json(
        { error: "No completed inspo consultation found — client needs to submit inspo photos and answer follow-up questions first." },
        { status: 404 }
      );
    }

    const aiAnalysis = latestWithIntel.ai_analysis as StoredAiAnalysis;
    const intel = aiAnalysis.stylistIntelligence!;

    // Get the client's answers from intake_responses
    const { data: intakeResponse } = await admin
      .from("intake_responses")
      .select("answers")
      .eq("client_id", clientId)
      .filter("answers->>inspo_submission_id", "eq", latestWithIntel.id)
      .single();

    // Build formula history string
    const formulaHistory = formulaEntries.length > 0
      ? formulaEntries.slice(0, 10).map((e) =>
          `- ${e.serviceDate}: ${e.rawNotes}${e.generalNotes ? ` (Notes: ${e.generalNotes})` : ""}`
        ).join("\n")
      : null;

    // Build product catalog with instructions for the AI
    const productNames = products.length > 0
      ? products.map((p) => `${p.brand || ""} ${p.line || ""} ${p.shade || ""} ${p.name || ""}`.trim()).filter(Boolean)
      : [];
    const productCatalog = [
      "PRODUCT RULES: The salon carries ONLY the products listed below. Reference these by name when they apply.",
      "If the formula needs a product NOT in this list, use generic industry terms (e.g. 'lightener', '20 vol developer', 'demi-permanent gloss', '10AV toner').",
      "NEVER reference specific brand names or product lines that are not in the list below.",
      "---",
      ...(productNames.length > 0 ? productNames : ["(No products in inventory — use only generic industry terms for all products)"]),
    ];

    const suggestion = await generateInspoFormulaSuggestion({
      stylistIntelligence: intel,
      clientSummary: aiAnalysis.clientSummary || null,
      formulaHistory,
      clientContext: client.preferenceProfile
        ? {
            firstName: client.firstName ?? undefined,
            colorDirection: client.preferenceProfile.colorDirection,
            maintenanceLevel: client.preferenceProfile.maintenanceLevel,
            styleNotes: client.preferenceProfile.styleNotes,
          }
        : { firstName: client.firstName ?? undefined },
      questions: aiAnalysis.generatedFormQuestions || [],
      answers: intakeResponse?.answers || {},
      productCatalog,
    });

    // Fetch inspo photos for the submission
    const { data: files } = await admin.storage
      .from("client-inspo")
      .list(`${latestWithIntel.workspace_id}/${clientId}/${latestWithIntel.id}`);

    const photoUrls = (files || [])
      .filter((f) => !f.name.startsWith("."))
      .map((f) => {
        const { data } = admin.storage
          .from("client-inspo")
          .getPublicUrl(`${latestWithIntel.workspace_id}/${clientId}/${latestWithIntel.id}/${f.name}`);
        return data.publicUrl;
      });

    return NextResponse.json({
      suggestion: {
        ...suggestion,
        inspo_date: latestWithIntel.created_at,
        photoUrls,
      },
    });
  } catch (error) {
    console.error("Failed to generate inspo formula suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
