import { NextResponse } from "next/server";
import { getFormulaSuggestion } from "@/lib/kernel";
import { getCurrentWorkspace } from "@/lib/db/workspaces";

export async function POST(request: Request) {
  try {
    const { clientId, serviceTypeName } = await request.json();

    if (!clientId || !serviceTypeName) {
      return NextResponse.json(
        { error: "clientId and serviceTypeName are required" },
        { status: 400 }
      );
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const suggestion = await getFormulaSuggestion(
      workspace.id,
      clientId,
      serviceTypeName
    );

    if (!suggestion) {
      return NextResponse.json(
        { error: "No suggestion available — not enough history yet" },
        { status: 404 }
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
