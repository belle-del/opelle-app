"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ServiceType } from "@/lib/types";

export function ServiceTypesManager() {
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/service-types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTypes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/service-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.ok) {
      const created = await res.json();
      setTypes((prev) => [...prev, created]);
      setNewName("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service type? Existing formulas using it will be affected.")) return;

    const res = await fetch(`/api/service-types/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleRename = async (id: string, name: string) => {
    await fetch(`/api/service-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-3">
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
    </div>
  );
}
