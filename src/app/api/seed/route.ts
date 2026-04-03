import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/db/workspaces";

/**
 * POST /api/seed — Populate workspace with realistic demo data.
 * Products are all Redken. Idempotent: clears existing data first.
 */
export async function POST() {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const wid = workspace.id;

    // ── 1. Clear existing demo data (order matters for FK constraints) ──
    await admin.from("service_logs").delete().eq("workspace_id", wid);
    await admin.from("formula_entries").delete().eq("workspace_id", wid);
    await admin.from("formula_history").delete().eq("workspace_id", wid);
    await admin.from("tasks").delete().eq("workspace_id", wid);
    await admin.from("appointments").delete().eq("workspace_id", wid);
    await admin.from("products").delete().eq("workspace_id", wid);
    await admin.from("clients").delete().eq("workspace_id", wid);
    await admin.from("service_types").delete().eq("workspace_id", wid);
    await admin.from("activity_log").delete().eq("workspace_id", wid);

    // ── 2. Service Types ──
    const serviceTypeNames = [
      "Base Color",
      "All Over Color",
      "Gloss",
      "Partial Highlight",
      "Full Highlight",
      "Partial Balayage",
      "Full Balayage",
      "Corrective Color",
      "Toner",
      "Haircut & Style",
      "Blowout",
      "Deep Conditioning Treatment",
    ];

    const { data: serviceTypes } = await admin
      .from("service_types")
      .insert(
        serviceTypeNames.map((name, i) => ({
          workspace_id: wid,
          name,
          sort_order: i,
          duration_minutes: [60, 75, 30, 90, 120, 120, 150, 180, 45, 45, 30, 30][i],
        }))
      )
      .select("id, name");

    const stMap = Object.fromEntries((serviceTypes ?? []).map((s) => [s.name, s.id]));

    // ── 3. Clients ──
    const clientData = [
      { first_name: "Madison", last_name: "Chen", pronouns: "she/her", phone: "(512) 555-0134", email: "madison.chen@gmail.com", notes: "Natural level 5, wants to go lighter gradually. Sensitive scalp — always do patch test.", tags: ["color", "regular", "sensitive scalp"] },
      { first_name: "Olivia", last_name: "Rivera", pronouns: "she/her", phone: "(512) 555-0267", email: "olivia.r@outlook.com", notes: "Level 7 warm, loves dimensional color. Balayage every 12 weeks.", tags: ["balayage", "regular"] },
      { first_name: "Jake", last_name: "Thompson", pronouns: "he/him", phone: "(512) 555-0391", email: "jake.t@gmail.com", notes: "Grey blending on sides. Keeps it natural. Every 6 weeks.", tags: ["color", "grey blend", "regular"] },
      { first_name: "Sophia", last_name: "Patel", pronouns: "she/her", phone: "(512) 555-0445", email: "sophia.patel@yahoo.com", notes: "Virgin hair, first time color. Wants subtle highlights. Nervous about damage.", tags: ["highlight", "new client"] },
      { first_name: "Emma", last_name: "Williams", pronouns: "she/her", phone: "(512) 555-0512", email: "emma.w@gmail.com", notes: "Corrective client — came in with banding from box dye. Working on evening out.", tags: ["corrective", "color"] },
      { first_name: "Ava", last_name: "Johnson", pronouns: "she/her", phone: "(512) 555-0678", email: "ava.j@icloud.com", notes: "Level 8 cool blonde. Toner refresh every 4 weeks. Full highlight every 10 weeks.", tags: ["blonde", "toner", "regular"] },
      { first_name: "Lucas", last_name: "Martinez", pronouns: "he/him", phone: "(512) 555-0789", email: "lucas.m@gmail.com", notes: "Wants to cover greys but keep it looking very natural. Conservative.", tags: ["grey blend", "color"] },
      { first_name: "Riley", last_name: "Brooks", pronouns: "they/them", phone: "(512) 555-0834", email: "riley.b@proton.me", notes: "Creative color — currently has a rose gold balayage. Open to vivids.", tags: ["creative color", "balayage"] },
      { first_name: "Charlotte", last_name: "Davis", pronouns: "she/her", phone: "(512) 555-0901", email: "charlotte.d@gmail.com", notes: "Thick, coarse hair. Needs extra processing time. Full head of foils.", tags: ["highlight", "thick hair", "regular"] },
      { first_name: "Mia", last_name: "Nguyen", pronouns: "she/her", phone: "(512) 555-0956", email: "mia.nguyen@gmail.com", notes: "Fine hair, level 6. Wants low maintenance color. Gloss every visit.", tags: ["gloss", "low maintenance", "fine hair"] },
      { first_name: "Harper", last_name: "Lee", pronouns: "she/her", phone: "(512) 555-1023", email: "harper.l@gmail.com", notes: "New client referral from Olivia. Interested in partial balayage.", tags: ["new client", "balayage", "referral"] },
      { first_name: "Ethan", last_name: "Kim", pronouns: "he/him", phone: "(512) 555-1100", email: "ethan.kim@outlook.com", notes: "Fashion-forward. Currently doing an ashy dark blonde. Likes Shades EQ.", tags: ["color", "toner"] },
    ];

    const { data: clients } = await admin
      .from("clients")
      .insert(clientData.map((c) => ({ workspace_id: wid, ...c })))
      .select("id, first_name");

    const cMap = Object.fromEntries((clients ?? []).map((c) => [c.first_name, c.id]));

    // ── 4. Products — All Redken ──
    const products = [
      // Shades EQ Gloss (demi-permanent)
      { brand: "Redken", line: "Shades EQ Gloss", shade: "09V", name: "Platinum Ice", category: "demi-permanent", quantity: 4, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Violet", level: 9, tone: "Violet", commonlyMixedWith: ["09T", "09B"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Cool-toned level 9 gloss for toning blondes" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "09T", name: "Chrome", category: "demi-permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Titanium", level: 9, tone: "Titanium", commonlyMixedWith: ["09V", "09P"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Cool ash level 9 toner" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "09B", name: "Sterling", category: "demi-permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Blue", level: 9, tone: "Blue", commonlyMixedWith: ["09V", "09T"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.0, notes: "Blue-based level 9 for neutralizing warmth" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "09P", name: "Opal Glow", category: "demi-permanent", quantity: 5, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Pearl", level: 9, tone: "Pearl", commonlyMixedWith: ["09V", "09N"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Pearlescent level 9 toner" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "06N", name: "Moroccan Sand", category: "demi-permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Natural", level: 6, tone: "Natural", commonlyMixedWith: ["06NB", "06G"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Natural level 6 for blending and coverage" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "06NB", name: "Brandy", category: "demi-permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Natural Brown", level: 6, tone: "Natural Brown", commonlyMixedWith: ["06N", "05N"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Warm natural brown for grey blending" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "07G", name: "Saffron", category: "demi-permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Gold", level: 7, tone: "Gold", commonlyMixedWith: ["07N", "07NB"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Warm gold level 7 for dimensional warmth" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "08V", name: "Irid. Quartz", category: "demi-permanent", quantity: 4, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Violet", level: 8, tone: "Violet", commonlyMixedWith: ["08T", "09V"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Violet level 8 for cool toning" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "05N", name: "Walnut", category: "demi-permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Natural", level: 5, tone: "Natural", commonlyMixedWith: ["05NB", "06N"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Level 5 natural for base color refresh" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "09RB", name: "Blush", category: "demi-permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Red Brown", level: 9, tone: "Rose", commonlyMixedWith: ["09P", "09V"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Rose gold toner for creative color" } },

      // Cover Fusion (permanent with grey coverage)
      { brand: "Redken", line: "Cover Fusion", shade: "5NN", name: "Natural Natural", category: "permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1295, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural", level: 5, tone: "Natural", commonlyMixedWith: ["5NA", "6NN"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "100% grey coverage at level 5" } },
      { brand: "Redken", line: "Cover Fusion", shade: "6NA", name: "Natural Ash", category: "permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1295, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural Ash", level: 6, tone: "Ash", commonlyMixedWith: ["6NN", "5NA"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Cool natural for grey coverage" } },
      { brand: "Redken", line: "Cover Fusion", shade: "7NW", name: "Natural Warm", category: "permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1295, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural Warm", level: 7, tone: "Warm", commonlyMixedWith: ["7NN", "6NW"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Warm natural for grey blending" } },

      // Color Gels Lacquers (permanent)
      { brand: "Redken", line: "Color Gels Lacquers", shade: "6N", name: "Moroccan Sand", category: "permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1150, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural", level: 6, tone: "Natural", commonlyMixedWith: ["6NA", "7N"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Permanent level 6 natural" } },
      { brand: "Redken", line: "Color Gels Lacquers", shade: "8N", name: "Mojave", category: "permanent", quantity: 2, low_stock_threshold: 2, size_oz: 2, cost_cents: 1150, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural", level: 8, tone: "Natural", commonlyMixedWith: ["8NA", "8NW"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Level 8 natural base" } },
      { brand: "Redken", line: "Color Gels Lacquers", shade: "5NW", name: "Macchiato", category: "permanent", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1150, enrichment: { brandFamily: "Redken", lineType: "Permanent Color", shadeFamily: "Natural Warm", level: 5, tone: "Natural Warm", commonlyMixedWith: ["5N", "6NW"], typicalDeveloper: "20 Vol", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Warm level 5 for rich brunette tones" } },

      // Flash Lift (lightener)
      { brand: "Redken", line: "Flash Lift", shade: "Bonder Inside", name: "Flash Lift Bonder Inside", category: "lightener", quantity: 2, low_stock_threshold: 1, size_oz: 16, cost_cents: 4295, enrichment: { brandFamily: "Redken", lineType: "Lightener", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "20 Vol or 30 Vol", typicalRatio: "1:2", avgUsageOzPerAppointment: 3.0, notes: "Up to 8 levels of lift with built-in bonder" } },

      // Developers
      { brand: "Redken", line: "Pro-Oxide Cream Developer", shade: "10 Vol", name: "10 Volume Developer", category: "developer", quantity: 3, low_stock_threshold: 1, size_oz: 32, cost_cents: 1495, enrichment: { brandFamily: "Redken", lineType: "Developer", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "N/A", typicalRatio: "N/A", avgUsageOzPerAppointment: 2.0, notes: "Deposit only, no lift" } },
      { brand: "Redken", line: "Pro-Oxide Cream Developer", shade: "20 Vol", name: "20 Volume Developer", category: "developer", quantity: 4, low_stock_threshold: 1, size_oz: 32, cost_cents: 1495, enrichment: { brandFamily: "Redken", lineType: "Developer", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "N/A", typicalRatio: "N/A", avgUsageOzPerAppointment: 2.0, notes: "1–2 levels of lift, standard developer" } },
      { brand: "Redken", line: "Pro-Oxide Cream Developer", shade: "30 Vol", name: "30 Volume Developer", category: "developer", quantity: 3, low_stock_threshold: 1, size_oz: 32, cost_cents: 1495, enrichment: { brandFamily: "Redken", lineType: "Developer", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "N/A", typicalRatio: "N/A", avgUsageOzPerAppointment: 2.0, notes: "2–3 levels of lift" } },
      { brand: "Redken", line: "Pro-Oxide Cream Developer", shade: "40 Vol", name: "40 Volume Developer", category: "developer", quantity: 2, low_stock_threshold: 1, size_oz: 32, cost_cents: 1495, enrichment: { brandFamily: "Redken", lineType: "Developer", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "N/A", typicalRatio: "N/A", avgUsageOzPerAppointment: 2.0, notes: "3–4 levels of lift, use with caution" } },

      // Shades EQ Processing Solution
      { brand: "Redken", line: "Shades EQ", shade: "Processing Solution", name: "Shades EQ Processing Solution", category: "developer", quantity: 3, low_stock_threshold: 1, size_oz: 32, cost_cents: 1695, enrichment: { brandFamily: "Redken", lineType: "Processing Solution", shadeFamily: "N/A", level: 0, tone: "N/A", commonlyMixedWith: [], typicalDeveloper: "N/A", typicalRatio: "1:1", avgUsageOzPerAppointment: 2.0, notes: "Acidic processing solution for Shades EQ Gloss" } },

      // Additives
      { brand: "Redken", line: "Shades EQ Gloss", shade: "000", name: "Crystal Clear", category: "additive", quantity: 3, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Clear", level: 0, tone: "Clear", commonlyMixedWith: ["09V", "09P", "09T"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.0, notes: "Clear diluter for pastel and sheer effects" } },

      // Low stock items for demo alerts
      { brand: "Redken", line: "Shades EQ Gloss", shade: "07N", name: "Mirage", category: "demi-permanent", quantity: 1, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Natural", level: 7, tone: "Natural", commonlyMixedWith: ["07G", "07NB"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "Low stock — reorder soon" } },
      { brand: "Redken", line: "Shades EQ Gloss", shade: "08N", name: "Mojave", category: "demi-permanent", quantity: 0, low_stock_threshold: 2, size_oz: 2, cost_cents: 1195, enrichment: { brandFamily: "Redken", lineType: "Demi-Permanent Gloss", shadeFamily: "Natural", level: 8, tone: "Natural", commonlyMixedWith: ["08V", "08T"], typicalDeveloper: "Shades EQ Processing Solution", typicalRatio: "1:1", avgUsageOzPerAppointment: 1.5, notes: "OUT OF STOCK" } },
    ];

    await admin.from("products").insert(
      products.map((p) => ({ workspace_id: wid, ...p }))
    );

    // ── 5. Appointments (past completed + upcoming scheduled) ──
    const now = new Date();
    const day = (offset: number, hour: number, min = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      d.setHours(hour, min, 0, 0);
      return d.toISOString();
    };

    const appointments = [
      // Past completed
      { client_id: cMap["Madison"], service_name: "Full Highlight", start_at: day(-21, 10), duration_mins: 120, status: "completed", notes: "Foils with Flash Lift + 20 vol. Toned with 09V + 09P Shades EQ." },
      { client_id: cMap["Olivia"], service_name: "Partial Balayage", start_at: day(-18, 13), duration_mins: 120, status: "completed", notes: "Hand-painted with Flash Lift + 30 vol. Toned with 07G + 08V Shades EQ." },
      { client_id: cMap["Jake"], service_name: "Base Color", start_at: day(-14, 9), duration_mins: 60, status: "completed", notes: "Cover Fusion 7NW + 20 vol. Grey blend on sides and crown." },
      { client_id: cMap["Ava"], service_name: "Toner", start_at: day(-12, 11), duration_mins: 45, status: "completed", notes: "Toner refresh: Shades EQ 09V + 09T + Processing Solution." },
      { client_id: cMap["Emma"], service_name: "Corrective Color", start_at: day(-10, 10), duration_mins: 180, status: "completed", notes: "Session 2 of corrective. Lifted banding areas with Flash Lift + 20 vol. Toned with Shades EQ 06N + 07N." },
      { client_id: cMap["Mia"], service_name: "Gloss", start_at: day(-8, 14), duration_mins: 30, status: "completed", notes: "Shades EQ 06N + 06NB + Processing Solution. Beautiful warm brunette result." },
      { client_id: cMap["Charlotte"], service_name: "Full Highlight", start_at: day(-7, 9), duration_mins: 150, status: "completed", notes: "Full head foils. Extra processing time needed — thick hair. Flash Lift + 30 vol. Toned 09P + 000." },
      { client_id: cMap["Lucas"], service_name: "Base Color", start_at: day(-5, 10), duration_mins: 60, status: "completed", notes: "Cover Fusion 5NN + 6NA + 20 vol. Natural grey blend." },
      { client_id: cMap["Riley"], service_name: "Partial Balayage", start_at: day(-3, 13), duration_mins: 120, status: "completed", notes: "Rose gold balayage refresh. Flash Lift + 20 vol on new growth areas. Toned with 09RB + 000 Shades EQ." },
      { client_id: cMap["Ethan"], service_name: "Toner", start_at: day(-2, 15), duration_mins: 45, status: "completed", notes: "Shades EQ 08V + 09T. Ashy dark blonde refresh." },

      // Upcoming scheduled
      { client_id: cMap["Madison"], service_name: "Toner", start_at: day(1, 10), duration_mins: 45, status: "scheduled", notes: "Toner refresh before her event this weekend." },
      { client_id: cMap["Sophia"], service_name: "Partial Highlight", start_at: day(1, 13), duration_mins: 90, status: "scheduled", notes: "First color service — keep it subtle. Plan: baby lights around face." },
      { client_id: cMap["Olivia"], service_name: "Gloss", start_at: day(2, 11), duration_mins: 30, status: "scheduled", notes: "Gloss refresh between balayage sessions." },
      { client_id: cMap["Jake"], service_name: "Base Color", start_at: day(3, 9), duration_mins: 60, status: "scheduled", notes: "Regular grey blend appointment." },
      { client_id: cMap["Harper"], service_name: "Partial Balayage", start_at: day(3, 13, 30), duration_mins: 120, status: "scheduled", notes: "New client consultation + partial balayage. Referred by Olivia." },
      { client_id: cMap["Ava"], service_name: "Full Highlight", start_at: day(5, 10), duration_mins: 120, status: "scheduled", notes: "Full highlight refresh — been 10 weeks." },
      { client_id: cMap["Emma"], service_name: "Corrective Color", start_at: day(7, 10), duration_mins: 180, status: "scheduled", notes: "Session 3 of corrective. Goal: even out remaining banding at nape." },
      { client_id: cMap["Charlotte"], service_name: "Partial Highlight", start_at: day(8, 9), duration_mins: 90, status: "scheduled", notes: "Partial refresh — grow-out touch up on face frame and crown." },
      { client_id: cMap["Mia"], service_name: "Gloss", start_at: day(10, 14), duration_mins: 30, status: "scheduled", notes: "Monthly gloss refresh." },
      { client_id: cMap["Riley"], service_name: "Full Balayage", start_at: day(12, 10), duration_mins: 150, status: "scheduled", notes: "Transitioning to more vivid rose gold. Discuss adding peekaboo panels." },
    ];

    const { data: appts } = await admin
      .from("appointments")
      .insert(appointments.map((a) => ({ workspace_id: wid, ...a })))
      .select("id, client_id, status, service_name");

    // ── 6. Service Logs for completed appointments ──
    const completedAppts = (appts ?? []).filter((a) => a.status === "completed");
    if (completedAppts.length > 0) {
      const serviceLogs = completedAppts.map((a) => {
        const logs: Record<string, string> = {
          "Full Highlight": "Client wanted cooler blonde. Discussed processing time and importance of toner. Watched how foils are placed for maximum lift with minimal overlap.",
          "Partial Balayage": "Hand painting technique — practiced sweeping motion. Client loved the natural sun-kissed result. Good learning on where to place pieces for dimension.",
          "Base Color": "Applied root to ends. Observed how Cover Fusion processes differently on resistant grey. Timing was key — pulled at 35 min.",
          "Toner": "Mixed Shades EQ at the bowl. Discussed why we chose these specific tones for the client's skin tone. Quick service but great learning on color theory.",
          "Corrective Color": "Complex service. Learned about sectioning for banding correction. Instructor guided placement of lightener. Important to watch timing per section.",
          "Gloss": "Simple but effective service. Practiced application speed. Good result — client was happy with the shine and tone refresh.",
        };
        const logText = logs[a.service_name] || "Standard service completed. Good learning experience.";
        return {
          workspace_id: wid,
          appointment_id: a.id,
          consult_notes: `Reviewed client history and discussed goals for today's ${a.service_name.toLowerCase()} service.`,
          aftercare_notes: "Recommended Redken Color Extend Magnetics shampoo and conditioner. Avoid washing for 48 hours. Use lukewarm water.",
          learning_notes: logText,
        };
      });
      await admin.from("service_logs").insert(serviceLogs);
    }

    // ── 7. Formula Entries for completed appointments ──
    const formulaEntries = [
      { client_id: cMap["Madison"], service_type_id: stMap["Full Highlight"], raw_notes: "Bowl 1: Flash Lift Bonder Inside + 20 vol (1:2)\nFoils: full head, weave pattern\nProcess 35 min\n\nBowl 2 (toner): Shades EQ 09V + 09P (equal parts) + Processing Solution\nProcess 20 min at bowl", general_notes: "Great lift. Even results. Client loved the cool platinum tone.", service_date: day(-21, 10) },
      { client_id: cMap["Olivia"], service_type_id: stMap["Partial Balayage"], raw_notes: "Bowl 1: Flash Lift Bonder Inside + 30 vol (1:1.5)\nHand-painted: face frame, crown, money pieces\nProcess 40 min under plastic\n\nBowl 2 (toner): Shades EQ 07G + 08V (2:1) + Processing Solution\nProcess 20 min", general_notes: "Beautiful dimension. The 07G added just enough warmth without going brassy.", service_date: day(-18, 13) },
      { client_id: cMap["Jake"], service_type_id: stMap["Base Color"], raw_notes: "Cover Fusion 7NW + 20 vol Pro-Oxide (1:1)\nApply to grey areas: temples, sides, crown\nProcess 35 min\nEmulsify and rinse", general_notes: "Natural result. Client can't tell he colors his hair — perfect.", service_date: day(-14, 9) },
      { client_id: cMap["Ava"], service_type_id: stMap["Toner"], raw_notes: "Shades EQ 09V + 09T (1:1) + Processing Solution\nApply root to ends on damp hair\nProcess 20 min\nRinse when desired tone achieved", general_notes: "Quick toner refresh. Neutralized brass from 4 weeks of sun exposure.", service_date: day(-12, 11) },
      { client_id: cMap["Emma"], service_type_id: stMap["Corrective Color"], raw_notes: "Section 1 (banding at mid-lengths):\nFlash Lift Bonder Inside + 20 vol (1:2)\nFoils on banded sections only\nProcess 25 min — watch closely\n\nSection 2 (toner):\nShades EQ 06N + 07N (1:1) + Processing Solution\nProcess 20 min", general_notes: "Session 2 of corrective. Much more even than last visit. One more session should resolve remaining banding at nape.", service_date: day(-10, 10) },
      { client_id: cMap["Mia"], service_type_id: stMap["Gloss"], raw_notes: "Shades EQ 06N + 06NB (2:1) + Processing Solution\nApply root to ends on towel-dried hair\nProcess 20 min", general_notes: "Beautiful warm brunette. Client loves the low-maintenance routine. Rebook in 4 weeks.", service_date: day(-8, 14) },
      { client_id: cMap["Charlotte"], service_type_id: stMap["Full Highlight"], raw_notes: "Bowl 1: Flash Lift Bonder Inside + 30 vol (1:2)\nFull head foils — fine weave, close to scalp\nProcess 45 min (thick, resistant hair — needed extra time)\n\nBowl 2 (toner): Shades EQ 09P + 000 (1:1) + Processing Solution\nProcess 20 min", general_notes: "Thick coarse hair needed 45 min to lift. Good result but need to account for extra time in scheduling.", service_date: day(-7, 9) },
      { client_id: cMap["Riley"], service_type_id: stMap["Partial Balayage"], raw_notes: "Bowl 1: Flash Lift Bonder Inside + 20 vol (1:2)\nRefresh on new growth — face frame and top sections only\nProcess 30 min\n\nBowl 2 (toner): Shades EQ 09RB + 000 (2:1) + Processing Solution\nProcess 20 min", general_notes: "Rose gold came out beautifully. Client wants to go more vivid next time — discuss adding peekaboo panels.", service_date: day(-3, 13) },
    ];

    await admin.from("formula_entries").insert(
      formulaEntries.map((f) => ({ workspace_id: wid, ...f }))
    );

    // ── 8. Tasks ──
    const tasks = [
      { title: "Practice foil placement on mannequin", notes: "Focus on tight weave pattern near the scalp line. Use Redken Flash Lift.", status: "completed", due_at: day(-10, 17) },
      { title: "Study Redken color theory basics", notes: "Review the Redken level system and underlying pigment chart. Know warmth at each level.", status: "completed", due_at: day(-7, 17) },
      { title: "Document corrective color process for Emma", notes: "Write up the full corrective plan (3 sessions). Include before photos and formula for each session.", status: "in_progress", due_at: day(3, 17) },
      { title: "Practice balayage hand-painting technique", notes: "Use mannequin. Focus on graduated saturation — heavier at ends, lighter at root area. Time yourself.", status: "in_progress", due_at: day(5, 17) },
      { title: "Review Shades EQ color chart", notes: "Memorize the level 8–9 range toners. Know which tones neutralize which warmth.", status: "pending", due_at: day(7, 17) },
      { title: "Complete toner formulation quiz", notes: "Instructor wants quiz done before next corrective appointment. Focus on underlying pigment + toner choice.", status: "pending", due_at: day(6, 17) },
      { title: "Shadow senior stylist during corrective color", notes: "Observe sectioning and timing decisions during a banding correction. Take notes.", status: "pending", due_at: day(8, 12) },
      { title: "Inventory check — restock Shades EQ", notes: "Several shades are low or out. Place order for: 07N, 08N, and restock 09V.", status: "pending", due_at: day(1, 12) },
    ];

    await admin.from("tasks").insert(
      tasks.map((t) => ({
        workspace_id: wid,
        ...t,
        reminder_enabled: false,
        attachments: [],
      }))
    );

    // ── 9. Activity Log ──
    const activities = [
      { action: "client.created", entity_type: "client", entity_id: cMap["Harper"], label: "Harper Lee", created_at: day(-1, 9) },
      { action: "appointment.created", entity_type: "appointment", label: "Partial Balayage — Harper Lee", created_at: day(-1, 9, 5) },
      { action: "appointment.completed", entity_type: "appointment", label: "Toner — Ethan Kim", created_at: day(-2, 16) },
      { action: "appointment.completed", entity_type: "appointment", label: "Partial Balayage — Riley Brooks", created_at: day(-3, 15, 30) },
      { action: "formula.created", entity_type: "formula_entry", label: "Riley Brooks — Partial Balayage", created_at: day(-3, 15, 35) },
      { action: "product.low_stock", entity_type: "product", label: "Redken Shades EQ 07N Mirage — Low Stock", created_at: day(-4, 10) },
      { action: "product.out_of_stock", entity_type: "product", label: "Redken Shades EQ 08N Mojave — Out of Stock", created_at: day(-4, 10, 5) },
      { action: "appointment.completed", entity_type: "appointment", label: "Base Color — Lucas Martinez", created_at: day(-5, 11, 30) },
      { action: "task.completed", entity_type: "task", label: "Study Redken color theory basics", created_at: day(-7, 16) },
      { action: "appointment.completed", entity_type: "appointment", label: "Full Highlight — Charlotte Davis", created_at: day(-7, 12) },
      { action: "task.completed", entity_type: "task", label: "Practice foil placement on mannequin", created_at: day(-10, 16) },
      { action: "appointment.completed", entity_type: "appointment", label: "Corrective Color — Emma Williams", created_at: day(-10, 16, 30) },
    ];

    await admin.from("activity_log").insert(
      activities.map((a) => ({ workspace_id: wid, ...a }))
    );

    return NextResponse.json({
      success: true,
      seeded: {
        serviceTypes: serviceTypeNames.length,
        clients: clientData.length,
        products: products.length,
        appointments: appointments.length,
        serviceLogs: completedAppts.length,
        formulaEntries: formulaEntries.length,
        tasks: tasks.length,
        activityLog: activities.length,
      },
    });
  } catch (error) {
    console.error("[seed] Failed:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
