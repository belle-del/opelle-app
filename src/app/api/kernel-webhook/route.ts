import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // Validate webhook secret
  const secret = request.headers.get("X-Kernel-Webhook-Secret");
  if (secret !== process.env.KERNEL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    if (body.type === "enrichment_ready") {
      // Only allow writes to specific fields on specific tables
      const allowedWrites: Record<string, string[]> = {
        clients: ["preference_profile", "kernel_ref"],
        products: ["enrichment", "kernel_ref"],
      };

      for (const enrichment of body.enrichments ?? []) {
        const { target_table, target_id, field, value } = enrichment;

        if (!allowedWrites[target_table]?.includes(field)) {
          console.warn(`Blocked webhook write: ${target_table}.${field}`);
          continue;
        }

        await supabase
          .from(target_table)
          .update({ [field]: value })
          .eq("id", target_id)
          .eq("workspace_id", body.workspace_id);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Kernel webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
