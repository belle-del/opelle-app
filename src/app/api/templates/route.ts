import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { getTemplates, createTemplate } from "@/lib/db/templates";

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const templates = await getTemplates(workspace.id);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to list templates:", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, bodyTemplate } = body;

    if (!name || !category || !bodyTemplate) {
      return NextResponse.json(
        { error: "Name, category, and bodyTemplate are required" },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      workspaceId: workspace.id,
      name,
      category,
      bodyTemplate,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
