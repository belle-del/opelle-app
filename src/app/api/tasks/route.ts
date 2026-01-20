import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/db/tasks";

export async function GET() {
  try {
    const tasks = await listTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await createTask({
      title: body.title,
      notes: body.notes,
      dueAt: body.dueAt,
    });

    if (!task) {
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
