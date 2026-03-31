"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Clock } from "lucide-react";
import type { ServiceType } from "@/lib/types";

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 75, label: "1h 15m" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
  { value: 150, label: "2.5 hr" },
  { value: 180, label: "3 hr" },
  { value: 240, label: "4 hr" },
];

export function ServiceTypesManager({ workspaceId }: { workspaceId?: string }) {
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`/api/service-types?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTypes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    if (!workspaceId) {
      setError("Workspace not loaded — try refreshing the page");
      return;
    }
    setError(null);

    try {
      const res = await fetch("/api/service-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), durationMinutes: 60, workspaceId }),
      });

      if (res.ok) {
        const created = await res.json();
        setTypes((prev) => [...prev, created]);
        setNewName("");
      } else {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody.error || `Failed (${res.status})`;
        setError(msg);
        console.error("[ServiceTypesManager] Add failed:", res.status, msg);
      }
    } catch (err) {
      setError("Network error — check console");
      console.error("[ServiceTypesManager] Network error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service type? Existing formulas using it will be affected.")) return;

    const res = await fetch(`/api/service-types/${id}?workspaceId=${workspaceId}`, { method: "DELETE" });
    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleRename = async (id: string, name: string) => {
    await fetch(`/api/service-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspaceId }),
    });
  };

  const handleDurationChange = async (id: string, durationMins: number) => {
    // Optimistic update
    setTypes((prev) =>
      prev.map((t) => t.id === id ? { ...t, durationMinutes: durationMins } : t)
    );

    await fetch(`/api/service-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMinutes: durationMins, workspaceId }),
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Column headers */}
      {types.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", marginBottom: "4px" }}>
          <div style={{ width: "16px" }} />
          <span style={{ flex: 1, fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-ghost)" }}>
            Service Name
          </span>
          <span style={{ width: "100px", fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-ghost)", textAlign: "center" }}>
            Default Time
          </span>
          <div style={{ width: "28px" }} />
        </div>
      )}

      {types.map((st) => (
        <div
          key={st.id}
          className="flex items-center gap-3 rounded-lg px-4 py-2.5"
          style={{ border: "1px solid var(--stone-mid)", background: "var(--stone-card)" }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <input
            type="text"
            defaultValue={st.name}
            onBlur={(e) => {
              if (e.target.value !== st.name) {
                handleRename(st.id, e.target.value);
              }
            }}
            className="flex-1 bg-transparent text-sm focus:outline-none rounded px-1"
            style={{ color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100px" }}>
            <Clock size={11} style={{ color: "var(--text-on-stone-ghost)", flexShrink: 0 }} />
            <select
              value={st.durationMinutes || 60}
              onChange={(e) => handleDurationChange(st.id, parseInt(e.target.value))}
              style={{
                background: "transparent",
                border: "1px solid var(--stone-mid)",
                borderRadius: "4px",
                padding: "2px 4px",
                fontSize: "11px",
                color: "var(--text-on-stone-faint)",
                width: "100%",
                outline: "none",
              }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(st.id)}
            className="p-1"
            style={{ color: "var(--status-low)" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New service type..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: "12px", color: "var(--garnet)", marginTop: "8px", fontWeight: 500 }}>
          {error}
        </p>
      )}

      <p style={{ fontSize: "10px", color: "var(--text-on-stone-ghost)", marginTop: "8px" }}>
        Default times auto-fill when creating appointments. You can always adjust the duration per appointment.
      </p>
    </div>
  );
}
