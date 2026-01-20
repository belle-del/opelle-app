"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, GraduationCap, Check, Circle, Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";

export default function EducationPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      const task = await res.json();
      setTasks([task, ...tasks]);
      setNewTaskTitle("");
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks(tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Learning
        </p>
        <h2 className="text-3xl font-semibold">Education Tasks</h2>
        <p className="text-muted-foreground">
          Track your practice goals and skill-building activities.
        </p>
      </header>

      {/* Add Task */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTask} className="flex gap-3">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g., Practice balayage technique, Study color theory..."
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !newTaskTitle.trim()}>
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Add Task</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground">
              Add your first learning goal above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Circle className="w-5 h-5 text-amber-400" />
                To Do ({pendingTasks.length})
              </h3>
              {pendingTasks.map((task) => (
                <Card key={task.id} className="hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => toggleTask(task)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center hover:border-emerald-400 transition-colors">
                          {/* Empty circle */}
                        </div>
                        <span className="font-medium">{task.title}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.status === "in_progress" ? "warning" : "outline"}>
                          {task.status === "in_progress" ? "In Progress" : "Pending"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTask(task.id)}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-2 ml-9">
                        {task.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium flex items-center gap-2 text-muted-foreground">
                <Check className="w-5 h-5 text-emerald-400" />
                Completed ({completedTasks.length})
              </h3>
              {completedTasks.map((task) => (
                <Card key={task.id} className="opacity-60 hover:opacity-80 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => toggleTask(task)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="line-through text-muted-foreground">{task.title}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        &times;
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
