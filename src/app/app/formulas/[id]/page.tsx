"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { FormulaEntry } from "@/lib/types";

type PhotoData = {
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  resultNotes: string | null;
  clientSatisfaction: number | null;
  completedAt: string;
} | null;

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<FormulaEntry | null>(null);
  const [photos, setPhotos] = useState<PhotoData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/formula-entries/${id}`).then((r) => r.json()),
      fetch(`/api/formula-entries/${id}/photos`).then((r) => r.json()),
    ])
      .then(([entryData, photoData]) => {
        setEntry(entryData?.id ? entryData : null);
        setPhotos(photoData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "#8A8778" }}>
        Loading…
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "#8A8778" }}>
        Formula not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/app/formulas"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#6B5D4A" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Formulas
        </Link>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A" }}>
          Formula
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24", fontWeight: 300 }}>
          {formatDate(entry.serviceDate)}
        </h2>
      </header>

      {/* Formula notes */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(196,171,112,0.7)" }}>
            Formula Notes
          </p>
          <pre style={{
            fontSize: "13px", color: "var(--text-on-stone-dim, #B8B3A8)",
            fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {entry.rawNotes}
          </pre>
          {entry.generalNotes && (
            <p style={{ fontSize: "12px", color: "#8A8778", fontStyle: "italic", borderTop: "1px solid rgba(196,171,112,0.1)", paddingTop: "8px" }}>
              {entry.generalNotes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Visual Result */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(196,171,112,0.7)" }}>
            Visual Result
          </p>
          {photos ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {(["before", "after"] as const).map((side) => {
                  const url = side === "before" ? photos.beforePhotoUrl : photos.afterPhotoUrl;
                  return (
                    <div key={side}>
                      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(196,171,112,0.6)", marginBottom: "6px" }}>
                        {side}
                      </p>
                      <div style={{ borderRadius: "10px", overflow: "hidden", aspectRatio: "3/4", background: "#1A1A14" }}>
                        {url ? (
                          <img src={url} alt={`${side} photo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(196,171,112,0.3)", fontSize: "12px" }}>
                            No {side} photo
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {photos.resultNotes && (
                <p style={{ fontSize: "13px", color: "#7A7060", fontStyle: "italic" }}>
                  {photos.resultNotes}
                </p>
              )}
              {photos.clientSatisfaction && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "rgba(196,171,112,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Client Satisfaction</span>
                  <span style={{ fontSize: "14px" }}>
                    {"★".repeat(photos.clientSatisfaction)}{"☆".repeat(5 - photos.clientSatisfaction)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: "13px", color: "#8A8778" }}>
              No photo on file for this formula.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
