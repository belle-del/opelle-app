"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Eye, EyeOff, Loader2, Check } from "lucide-react";

interface AftercareEditorProps {
  appointmentId: string;
  clientId: string;
  existingPlan?: {
    id: string;
    clientVisibleNotes?: string;
    publishedAt: string;
  } | null;
}

export function AftercareEditor({
  appointmentId,
  clientId,
  existingPlan,
}: AftercareEditorProps) {
  const [notes, setNotes] = useState(existingPlan?.clientVisibleNotes ?? "");
  const [published, setPublished] = useState(!!existingPlan?.publishedAt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [planId, setPlanId] = useState(existingPlan?.id ?? "");

  async function save(publish?: boolean) {
    setSaving(true);
    setSaved(false);
    try {
      if (planId) {
        const res = await fetch(`/api/aftercare/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientVisibleNotes: notes,
            publish: publish ?? published,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPublished(!!data.publishedAt);
          setSaved(true);
        }
      } else {
        const res = await fetch("/api/aftercare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            clientId,
            clientVisibleNotes: notes,
            publish: publish ?? false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPlanId(data.id);
          setPublished(!!data.publishedAt);
          setSaved(true);
        }
      }
    } catch (err) {
      console.error("Failed to save aftercare:", err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Aftercare
          </CardTitle>
          <div className="flex items-center gap-2">
            {published ? (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: "var(--status-confirmed, #4A7C59)" }}
              >
                <Eye className="w-3 h-3" />
                Visible to client
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: "var(--text-on-stone-ghost)" }}
              >
                <EyeOff className="w-3 h-3" />
                Draft
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Write aftercare instructions for your client.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Wait 48 hours before washing. Use color-safe shampoo. Avoid heat styling for the first week..."
          rows={5}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--brass-line, rgba(196,171,112,0.25))",
            background: "var(--stone-card, #FAF8F3)",
            color: "var(--text-on-stone, #2C2C2A)",
            fontSize: "13px",
            fontFamily: "'DM Sans', sans-serif",
            resize: "vertical",
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={() => save()}
            disabled={saving || !notes.trim()}
            variant="secondary"
            style={{ fontSize: "12px" }}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : saved ? (
              <Check className="w-3 h-3 mr-1" />
            ) : null}
            {saved ? "Saved" : "Save Draft"}
          </Button>
          {!published && notes.trim() && (
            <Button
              onClick={() => save(true)}
              disabled={saving}
              style={{ fontSize: "12px" }}
            >
              Publish to Client
            </Button>
          )}
          {published && (
            <Button
              onClick={() => save(false)}
              disabled={saving}
              variant="ghost"
              style={{ fontSize: "12px" }}
            >
              Unpublish
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
