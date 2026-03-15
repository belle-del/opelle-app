import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/db/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const template = await getTemplate(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to get template:", error);
    return NextResponse.json({ error: "Failed to get template" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, category, bodyTemplate } = body;

    await updateTemplate(id, { name, category, bodyTemplate });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    await deleteTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
