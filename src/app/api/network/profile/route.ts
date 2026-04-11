import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOrCreateNetworkProfile,
  updateNetworkProfile,
} from "@/lib/db/network";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getOrCreateNetworkProfile(user.id);
    if (!profile)
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 }
      );

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Get own profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.displayName !== undefined)
      updates.display_name = body.displayName;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.specialties !== undefined)
      updates.specialties = body.specialties;
    if (body.location !== undefined) updates.location = body.location;
    if (body.profilePhotoUrl !== undefined)
      updates.profile_photo_url = body.profilePhotoUrl;
    if (body.coverPhotoUrl !== undefined)
      updates.cover_photo_url = body.coverPhotoUrl;
    if (body.portfolioVisible !== undefined)
      updates.portfolio_visible = body.portfolioVisible;
    if (body.acceptingClients !== undefined)
      updates.accepting_clients = body.acceptingClients;
    if (body.yearsExperience !== undefined)
      updates.years_experience = body.yearsExperience;
    if (body.certifications !== undefined)
      updates.certifications = body.certifications;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const profile = await updateNetworkProfile(user.id, updates);
    if (!profile)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
