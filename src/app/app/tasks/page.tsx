"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Plus,
  CheckSquare,
  Check,
  Circle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Bell,
  Paperclip,
  Calendar as CalendarIcon,
  Clock
} from "lucide-react";
import type { Task, Client, TaskAttachment } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";

export default function TasksPage() {
  // Task management state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Form state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskClientId, setNewTaskClientId] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDueTime, setNewTaskDueTime] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((res) => res.json()),
      fetch("/api/clients").then((res) => res.json()),
    ])
      .then(([tasksData, clientsData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
        setTasks([]);
        setClients([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAdding(true);
    try {
      // Combine date and time for due date
      let dueAt = undefined;
      if (newTaskDueDate) {
        dueAt = newTaskDueTime
          ? `${newTaskDueDate}T${newTaskDueTime}:00`
          : `${newTaskDueDate}T12:00:00`;
      }

      // Combine date and time for reminder
      let reminderAt = undefined;
      if (reminderEnabled && reminderDate) {
        reminderAt = reminderTime
          ? `${reminderDate}T${reminderTime}:00`
          : `${reminderDate}T09:00:00`;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          notes: newTaskNotes.trim() || undefined,
          clientId: newTaskClientId || undefined,
          dueAt,
          reminderAt,
          reminderEnabled,
        }),
      });
      const task = await res.json();
      setTasks([task, ...tasks]);

      // Reset form
      setNewTaskTitle("");
      setNewTaskNotes("");
      setNewTaskClientId("");
      setNewTaskDueDate("");
      setNewTaskDueTime("");
      setReminderEnabled(false);
      setReminderDate("");
      setReminderTime("");
      setShowAdvanced(false);
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

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Productivity
        </p>
        <h2 className="text-3xl font-semibold">Tasks</h2>
        <p className="text-muted-foreground">
          Manage your tasks, reminders, and client follow-ups.
        </p>
      </header>

      {/* Add Task */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTask} className="space-y-4">
            {/* Task Title */}
            <div>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Practice balayage technique, Study color theory..."
                className="w-full"
              />
            </div>

            {/* Advanced Options Toggle */}
            {!showAdvanced && (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdvanced(true)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Details
                </Button>
                <Button
                  type="submit"
                  disabled={adding || !newTaskTitle.trim()}
                  className="ml-auto"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="ml-2">Add Task</span>
                </Button>
              </div>
            )}

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 border-t pt-4">
                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Description</Label>
                  <Textarea
                    id="notes"
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="Add any additional details..."
                    rows={3}
                  />
                </div>

                {/* Client Selection */}
                {clients.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="client">Related Client (Optional)</Label>
                    <Select
                      id="client"
                      value={newTaskClientId}
                      onChange={(e) => setNewTaskClientId(e.target.value)}
                    >
                      <option value="">None</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {getClientDisplayName(client)}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>Due Date (Optional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={newTaskDueTime}
                        onChange={(e) => setNewTaskDueTime(e.target.value)}
                        disabled={!newTaskDueDate}
                      />
                    </div>
                  </div>
                </div>

                {/* Reminder */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reminder"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reminder" className="cursor-pointer">
                      Set Reminder
                    </Label>
                  </div>
                  {reminderEnabled && (
                    <div className="grid grid-cols-2 gap-3 ml-6">
                      <div>
                        <Input
                          type="date"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdvanced(false)}
                  >
                    Simple Mode
                  </Button>
                  <Button
                    type="submit"
                    disabled={adding || !newTaskTitle.trim()}
                    className="ml-auto"
                  >
                    {adding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span className="ml-2">Create Task</span>
                  </Button>
                </div>
              </div>
            )}
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
            <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground">
              Create your first task to get started.
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
              {pendingTasks.map((task) => {
                const client = task.clientId ? clientMap.get(task.clientId) : undefined;
                const isExpanded = expandedTaskId === task.id;

                return (
                  <Card key={task.id} className="hover:bg-white/10 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => toggleTask(task)}
                          className="flex items-start gap-3 flex-1 text-left"
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center hover:border-emerald-400 transition-colors mt-0.5 flex-shrink-0">
                            {/* Empty circle */}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{task.title}</span>
                              {client && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="w-3 h-3 mr-1" />
                                  {getClientDisplayName(client)}
                                </Badge>
                              )}
                              {task.reminderEnabled && task.reminderAt && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Reminder set
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {(task.notes || task.attachments.length > 0) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(task.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
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

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 ml-9 pt-4 border-t border-white/10 space-y-3">
                          {task.notes && (
                            <div>
                              <p className="text-sm font-medium mb-1">Description:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {task.notes}
                              </p>
                            </div>
                          )}
                          {task.attachments.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                Attachments ({task.attachments.length})
                              </p>
                              <div className="space-y-2">
                                {task.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-2 text-sm bg-white/5 rounded px-3 py-2"
                                  >
                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 hover:underline truncate"
                                    >
                                      {attachment.name}
                                    </a>
                                    <span className="text-xs text-muted-foreground">
                                      {(attachment.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium flex items-center gap-2 text-muted-foreground">
                <Check className="w-5 h-5 text-emerald-400" />
                Completed ({completedTasks.length})
              </h3>
              {completedTasks.map((task) => {
                const client = task.clientId ? clientMap.get(task.clientId) : undefined;

                return (
                  <Card key={task.id} className="opacity-60 hover:opacity-80 transition-opacity">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          onClick={() => toggleTask(task)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="line-through text-muted-foreground">{task.title}</span>
                              {client && (
                                <Badge variant="outline" className="text-xs opacity-50">
                                  <User className="w-3 h-3 mr-1" />
                                  {getClientDisplayName(client)}
                                </Badge>
                              )}
                            </div>
                          </div>
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
