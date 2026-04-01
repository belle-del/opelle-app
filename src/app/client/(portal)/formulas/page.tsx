"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

type FormulaHistoryItem = {
  id: string;
  formula: Record<string, unknown>;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  stylistNotes?: string;
  sharingLevel: string;
  createdAt: string;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FormulaDetail({ formula }: { formula: Record<string, unknown> }) {
  // Render formula JSONB in a human-readable way
  const base = formula.base as Record<string, unknown> | undefined;
  const technique = formula.technique as string | undefined;
  const processingTime = formula.processing_time_min as number | undefined;
  const bowls = formula.bowls as Array<Record<string, unknown>> | undefined;

  return (
    <div style={{ fontSize: "13px", color: "#5C5A4F", fontFamily: "'DM Sans', sans-serif" }}>
      {base && (
        <p>
          <span style={{ fontWeight: 500 }}>Base:</span>{" "}
          {base.product as string} {base.shade as string}
          {base.amount_g ? ` (${base.amount_g}g)` : ""}
        </p>
      )}
      {technique && (
        <p><span style={{ fontWeight: 500 }}>Technique:</span> {technique}</p>
      )}
      {processingTime && (
        <p><span style={{ fontWeight: 500 }}>Processing:</span> {processingTime} min</p>
      )}
      {bowls && bowls.length > 0 && (
        <div style={{ marginTop: "4px" }}>
          {bowls.map((bowl, i) => {
            const products = bowl.products as Array<Record<string, unknown>> | undefined;
            return (
              <div key={i} style={{ marginBottom: "4px" }}>
                <span style={{ fontWeight: 500, fontSize: "12px" }}>Bowl {i + 1}:</span>
                {products?.map((p, j) => (
                  <span key={j} style={{ marginLeft: "8px", fontSize: "12px" }}>
                    {p.brand as string} {p.shade as string}
                    {p.amount ? ` (${p.amount}${p.unit || "g"})` : ""}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {/* Fallback: show raw if no structured fields */}
      {!base && !bowls && (
        <p style={{ fontSize: "12px", color: "#8A8778", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(formula, null, 2)}
        </p>
      )}
    </div>
  );
}

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<FormulaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/formulas")
      .then((res) => res.json())
      .then((data) => setFormulas(data.formulas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h1 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: "24px",
        color: "#2C2C24",
      }}>
        My Formulas
      </h1>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p style={{ fontSize: "13px", color: "#7A7A72" }}>Loading your formulas...</p>
          </CardContent>
        </Card>
      ) : formulas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <svg
              width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#C4AB70" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M10 2v7.31" />
              <path d="M14 9.3V1.99" />
              <path d="M8.5 2h7" />
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
            <p style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "16px",
              color: "#2C2C24",
              marginBottom: "4px",
            }}>
              No formulas shared yet
            </p>
            <p style={{ fontSize: "12px", color: "#7A7A72" }}>
              When your stylist shares your color formulas, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {formulas.map((formula) => (
            <Card key={formula.id}>
              <CardContent style={{ padding: "16px" }}>
                <div className="flex items-start justify-between mb-3">
                  <p style={{
                    fontSize: "13px",
                    color: "#8A8778",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {formatDate(formula.createdAt)}
                  </p>
                  {formula.sharingLevel === "portable" && (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "20px",
                      color: "#4A7C59",
                      background: "rgba(74, 124, 89, 0.1)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Portable
                    </span>
                  )}
                </div>

                {/* Before/After Photos */}
                {(formula.beforePhotoUrl || formula.afterPhotoUrl) && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    {formula.beforePhotoUrl && (
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: "#8A8778",
                          marginBottom: "4px",
                          fontFamily: "'DM Sans', sans-serif",
                        }}>Before</p>
                        <img
                          src={formula.beforePhotoUrl}
                          alt="Before"
                          style={{
                            width: "100%",
                            aspectRatio: "3/4",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                    )}
                    {formula.afterPhotoUrl && (
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: "#8A8778",
                          marginBottom: "4px",
                          fontFamily: "'DM Sans', sans-serif",
                        }}>After</p>
                        <img
                          src={formula.afterPhotoUrl}
                          alt="After"
                          style={{
                            width: "100%",
                            aspectRatio: "3/4",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <FormulaDetail formula={formula.formula} />

                {formula.stylistNotes && (
                  <p style={{
                    fontSize: "12px",
                    color: "#8A8778",
                    marginTop: "8px",
                    fontStyle: "italic",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {formula.stylistNotes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
