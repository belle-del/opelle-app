import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MIN_TOKEN_LENGTH = 6;

const serviceRoleConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as { token?: string };
    const token = payload.token?.trim() ?? "";
    if (token.length < MIN_TOKEN_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "invalid_token" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { invite_token: token },
    });

    if (!updateError) {
      return NextResponse.json({ ok: true });
    }

    if (!serviceRoleConfigured()) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { error: adminError } = await admin.auth.admin.updateUserById(
      data.user.id,
      {
        user_metadata: { invite_token: token },
      }
    );

    if (adminError) {
      return NextResponse.json(
        { ok: false, error: adminError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to claim invite.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
