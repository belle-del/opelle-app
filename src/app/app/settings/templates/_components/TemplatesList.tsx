"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Pencil, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { MessageTemplate, TemplateCategory } from "@/lib/types";
import { TemplateEditor } from "./TemplateEditor";

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  rebook: "Rebook",
  thank_you: "Thank You",
  welcome: "Welcome",
  follow_up: "Follow Up",
  custom: "Custom",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  rebook: "var(--brass-accent)",
  thank_you: "var(--garnet-blush)",
  welcome: "var(--status-ok)",
  follow_up: "var(--text-on-stone-faint)",
  custom: "var(--brass-mid)",
};

function CategoryBadge({ category }: { category: TemplateCategory }) {
  const color = CATEGORY_COLORS[category] || "var(--text-on-stone-faint)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "1px 6px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

function TemplateCard({
  template,
  isSystem,
  onEdit,
  onDelete,
}: {
  template: MessageTemplate;
  isSystem: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview =
    template.bodyTemplate.length > 100
      ? template.bodyTemplate.slice(0, 100) + "..."
      : template.bodyTemplate;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        border: "1px solid var(--stone-mid)",
        background: "var(--stone-card)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Left side info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isSystem && (
              <Lock
                size={11}
                style={{ color: "var(--text-on-stone-ghost)", flexShrink: 0 }}
              />
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-on-stone)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {template.name}
            </span>
            <CategoryBadge category={template.category} />
          </div>
          {isSystem ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1"
              style={{
                fontSize: 12,
                color: "var(--text-on-stone-faint)",
                fontFamily: "'DM Sans', sans-serif",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expanded ? template.bodyTemplate : preview}
            </button>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-on-stone-faint)",
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              {preview}
            </p>
          )}
        </div>

        {/* Actions */}
        {!isSystem && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded"
              style={{ color: "var(--status-low)" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplatesList({
  templates: initialTemplates,
}: {
  templates: MessageTemplate[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const systemTemplates = templates.filter((t) => t.isSystem);
  const customTemplates = templates.filter((t) => !t.isSystem);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;

    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleSaved = (saved: MessageTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    setEditingId(null);
    setShowNew(false);
  };

  return (
    <div className="space-y-6">
      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div className="space-y-3">
          <h3
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-on-stone-ghost)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            System Templates
          </h3>
          {systemTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isSystem
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {/* Custom Templates */}
      <div className="space-y-3">
        <h3
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-on-stone-ghost)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Custom Templates
        </h3>

        {customTemplates.length === 0 && !showNew && (
          <div
            className="rounded-xl border border-dashed p-6 text-center"
            style={{ borderColor: "var(--stone-mid)" }}
          >
            <p
              style={{
                fontSize: 12,
                color: "var(--text-on-stone-faint)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              No custom templates yet. Create one to speed up client messaging.
            </p>
          </div>
        )}

        {customTemplates.map((t) =>
          editingId === t.id ? (
            <TemplateEditor
              key={t.id}
              template={t}
              onSaved={handleSaved}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TemplateCard
              key={t.id}
              template={t}
              isSystem={false}
              onEdit={() => setEditingId(t.id)}
              onDelete={() => handleDelete(t.id)}
            />
          )
        )}

        {/* New template form */}
        {showNew && (
          <TemplateEditor
            onSaved={handleSaved}
            onCancel={() => setShowNew(false)}
          />
        )}
      </div>

      {/* Add button */}
      {!showNew && (
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setShowNew(true);
          }}
          className="gap-1.5"
        >
          <Plus size={14} />
          Add Template
        </Button>
      )}

      <p
        style={{
          fontSize: 10,
          color: "var(--text-on-stone-ghost)",
          marginTop: 8,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        System templates are provided by default and cannot be edited. Create
        custom templates to personalize your messaging.
      </p>
    </div>
  );
}
