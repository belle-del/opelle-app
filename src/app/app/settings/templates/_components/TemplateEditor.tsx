"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MessageTemplate, TemplateCategory } from "@/lib/types";

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "rebook", label: "Rebook" },
  { value: "thank_you", label: "Thank You" },
  { value: "welcome", label: "Welcome" },
  { value: "follow_up", label: "Follow Up" },
  { value: "custom", label: "Custom" },
];

const VARIABLES = [
  { token: "{{clientName}}", desc: "Client's first name" },
  { token: "{{stylistName}}", desc: "Your display name" },
  { token: "{{weeksSinceVisit}}", desc: "Weeks since last visit" },
  { token: "{{lastServiceName}}", desc: "Last service booked" },
];

export function TemplateEditor({
  template,
  onSaved,
  onCancel,
}: {
  template?: MessageTemplate;
  onSaved: (t: MessageTemplate) => void;
  onCancel: () => void;
}) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(
    template?.category ?? "custom"
  );
  const [body, setBody] = useState(template?.bodyTemplate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      setError("Name and body are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEdit ? `/api/templates/${template.id}` : "/api/templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          bodyTemplate: body.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save template");
      }

      const saved = await res.json();
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-lg p-4 space-y-4"
      style={{
        border: "1px solid var(--brass-accent)",
        background: "var(--stone-card)",
      }}
    >
      {/* Name */}
      <div>
        <label
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-on-stone-ghost)",
            fontFamily: "'DM Sans', sans-serif",
            display: "block",
            marginBottom: 4,
          }}
        >
          Template Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Birthday Offer"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>

      {/* Category */}
      <div>
        <label
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-on-stone-ghost)",
            fontFamily: "'DM Sans', sans-serif",
            display: "block",
            marginBottom: 4,
          }}
        >
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TemplateCategory)}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid var(--stone-mid)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
            color: "var(--text-on-stone)",
            fontFamily: "'DM Sans', sans-serif",
            outline: "none",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div>
        <label
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-on-stone-ghost)",
            fontFamily: "'DM Sans', sans-serif",
            display: "block",
            marginBottom: 4,
          }}
        >
          Message Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Hi {{clientName}}, ..."
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid var(--stone-mid)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--text-on-stone)",
            fontFamily: "'DM Sans', sans-serif",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      {/* Available Variables */}
      <div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-on-stone-ghost)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 6,
          }}
        >
          Available Variables
        </p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => setBody((prev) => prev + v.token)}
              title={v.desc}
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--brass-accent)",
                background: "rgba(185,155,93,0.08)",
                border: "1px solid rgba(185,155,93,0.2)",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              {v.token}
            </button>
          ))}
        </div>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-on-stone-ghost)",
            marginTop: 4,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Click a variable to insert it into the message body.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            fontSize: 12,
            color: "var(--status-low)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
