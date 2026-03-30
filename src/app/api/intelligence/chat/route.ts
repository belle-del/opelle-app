import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { metisChat } from "@/lib/kernel";
import { logActivity } from "@/lib/db/activity-log";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { buildFullContext } from "@/lib/intelligence/buildFullContext";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Auth check with user-scoped client
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) {
      console.error("METIS-DIAG: workspace lookup failed for user", user.id, user.email);
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const body = await req.json();
    const { message, conversationHistory = [], context = {} } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build enriched context — handles client resolution, products,
    // appointments, formulas, inspo, lessons, and workspace settings
    const fullContext = await buildFullContext({
      workspaceId,
      userId: user.id,
      clientId: context.clientId,
      message,
      pageContext: context.page
        ? { page: context.page, entityType: context.entityType, entityId: context.entityId }
        : undefined,
    });

    // Shape workspace context for the kernel
    const workspaceContext: Record<string, unknown> = {
      workspace: fullContext.workspace,
      totalClients: fullContext.totalClients,
      totalProducts: fullContext.totalProducts,
      recentAppointments: fullContext.recentAppointments,
      upcomingAppointments: fullContext.upcomingAppointments,
      pendingTasks: fullContext.pendingTasks,
      products: fullContext.products,
      ...(fullContext.lowStockProducts ? { lowStockProducts: fullContext.lowStockProducts } : {}),
      ...(fullContext.client ? {
        matchedClient: {
          clientId: fullContext.client.id,
          clientName: fullContext.client.name,
          email: fullContext.client.email,
          phone: fullContext.client.phone,
          hairProfile: fullContext.client.hairProfile,
          preferences: fullContext.client.preferences,
          tags: fullContext.client.tags,
          notes: fullContext.client.notes,
          visitCount: fullContext.client.visitCount,
          lastVisit: fullContext.client.lastVisit,
          formulaHistory: fullContext.recentFormulas || [],
          inspoPhotos: fullContext.inspoPhotos || [],
        },
      } : {}),
      ...(fullContext.lessons.length > 0 ? { stylistLessons: fullContext.lessons } : {}),
      pageContext: fullContext.pageContext,
    };

    const result = await metisChat({
      message,
      conversationHistory,
      context,
      workspaceContext,
    });

    if (!result) {
      return NextResponse.json({ error: "Sorry, I couldn't reach Metis right now." }, { status: 503 });
    }

    // Log Metis chat to activity history
    const preview = message.length > 50 ? message.slice(0, 50) + "..." : message;
    await logActivity("metis.chat", "metis", "metis-chat", preview);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Metis chat route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
