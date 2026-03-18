import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientPreferenceProfile } from "@/lib/types";

async function getClientUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdminClient();

  if (user) {
    const { data: clientUser } = await admin
      .from("client_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .limit(1);
    if (clientUser && clientUser.length > 0) return clientUser[0];
  }

  // Cookie auth failed — return null (caller must handle)
  return null;
}

// Fallback: accept clientId from request body when cookie auth fails
async function getClientUserFromBody(body: Record<string, unknown>) {
  if (!body.clientId) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("client_users")
    .select("*")
    .eq("client_id", body.clientId as string)
    .limit(1);
  return data?.[0] || null;
}

/**
 * Build a notes section from client preference data.
 * Returns the section string or null if no preference data is present.
 */
function buildPreferencesNotesSection(pref: Partial<ClientPreferenceProfile>): string | null {
  const lines: string[] = [];
  if (pref.styleNotes) lines.push(`Hair Goals: ${pref.styleNotes}`);
  if (pref.allergies) lines.push(`Allergies: ${pref.allergies}`);
  if (pref.lifestyleNotes) lines.push(`Lifestyle: ${pref.lifestyleNotes}`);
  if (pref.maintenanceLevel) lines.push(`Maintenance: ${pref.maintenanceLevel}`);
  if (pref.visitCadenceDays) lines.push(`Visit Cadence: every ${pref.visitCadenceDays} days`);

  if (lines.length === 0) return null;
  return `--- Client Preferences ---\n${lines.join("\n")}`;
}

/**
 * Merge the preferences section into existing notes.
 * If existing notes already contain the section header, replace that section.
 * Otherwise append it.
 */
function mergeNotesWithPreferences(existingNotes: string | null, prefSection: string): string {
  const header = "--- Client Preferences ---";
  if (existingNotes && existingNotes.includes(header)) {
    // Replace from the header to the end (preferences section is always last)
    const idx = existingNotes.indexOf(header);
    const before = existingNotes.substring(0, idx).trimEnd();
    return before ? `${before}\n\n${prefSection}` : prefSection;
  }
  if (existingNotes && existingNotes.trim()) {
    return `${existingNotes.trimEnd()}\n\n${prefSection}`;
  }
  return prefSection;
}

/**
 * Generate tags from preference data and merge with existing tags.
 */
function mergeTagsWithPreferences(
  existingTags: string[],
  pref: Partial<ClientPreferenceProfile>
): string[] {
  const newTags: string[] = [];

  if (pref.maintenanceLevel) {
    const label = `Maintenance: ${pref.maintenanceLevel.charAt(0).toUpperCase() + pref.maintenanceLevel.slice(1)}`;
    newTags.push(label);
  }

  if (pref.visitCadenceDays && pref.visitCadenceDays > 0) {
    const weeks = Math.round(pref.visitCadenceDays / 7);
    newTags.push(`Every ${weeks} Weeks`);
  }

  if (pref.allergies && pref.allergies.trim()) {
    newTags.push("Has Allergies");
  }

  // Merge: add new tags that aren't already present (case-insensitive check)
  const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
  // Remove old auto-generated tags that may have changed
  const autoTagPrefixes = ["maintenance:", "every ", "has allergies"];
  const filtered = existingTags.filter((t) => {
    const lower = t.toLowerCase();
    return !autoTagPrefixes.some((prefix) => lower.startsWith(prefix) || lower === prefix);
  });

  for (const tag of newTags) {
    if (!filtered.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      filtered.push(tag);
    }
  }

  return filtered;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const clientUser = await getClientUser(supabase);
  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("*")
    .eq("id", clientUser.client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  const supabase = await createSupabaseServerClient();
  let clientUser = await getClientUser(supabase);
  if (!clientUser) {
    clientUser = await getClientUserFromBody(body);
  }
  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const allowedFields = ["first_name", "last_name", "pronouns", "phone", "preference_profile"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // If preference_profile is being updated, also sync to notes and tags
  if (updates.preference_profile) {
    const pref = updates.preference_profile as Partial<ClientPreferenceProfile>;

    // Fetch current client data for existing notes and tags
    const { data: currentClient } = await admin
      .from("clients")
      .select("notes, tags")
      .eq("id", clientUser.client_id)
      .single();

    const existingNotes: string | null = currentClient?.notes ?? null;
    const existingTags: string[] = currentClient?.tags ?? [];

    // Build and merge notes
    const prefSection = buildPreferencesNotesSection(pref);
    if (prefSection) {
      updates.notes = mergeNotesWithPreferences(existingNotes, prefSection);
    }

    // Build and merge tags
    updates.tags = mergeTagsWithPreferences(existingTags, pref);
  }

  const { data: client, error } = await admin
    .from("clients")
    .update(updates)
    .eq("id", clientUser.client_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ client });
}
