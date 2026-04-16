"use client";

import { useEffect, useState, useCallback } from "react";
import { KPICard } from "@/components/reports/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Palette, CheckCircle, XCircle, Clock } from "lucide-react";

type Stats = {
  totalFormulas: number;
  totalOutcomes: number;
  formulasWithPhotos: number;
  outcomesWithFeedback: number;
  shadeMappings: number;
};

type ColorLine = {
  id: string;
  brand: string;
  lineName: string;
  type: string;
  characteristics: Record<string, string>;
  shadeCount: number;
};

type Shade = {
  id: string;
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone: string | null;
};

type Outcome = {
  id: string;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess: boolean | null;
  stylistFeedback: string | null;
  adjustmentNotes: string | null;
  createdAt: string;
};

type DataQuality = {
  totalFormulas: number;
  formulasWithPhotos: number;
  photoPct: number;
  totalOutcomes: number;
  outcomesWithFeedback: number;
  feedbackPct: number;
  outcomesWithRating: number;
  ratingPct: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function TranslationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [colorLines, setColorLines] = useState<ColorLine[]>([]);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [shades, setShades] = useState<Record<string, Shade[]>>({});
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/translations/stats").then((r) => r.json()),
      fetch("/api/translations/color-lines").then((r) => r.json()),
      fetch("/api/translations/outcomes?limit=10").then((r) => r.json()),
      fetch("/api/translations/data-quality").then((r) => r.json()),
    ])
      .then(([statsData, linesData, outcomesData, qualityData]) => {
        setStats(statsData);
        setColorLines(linesData.colorLines ?? []);
        setOutcomes(outcomesData.outcomes ?? []);
        setDataQuality(qualityData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadShades = useCallback(async (lineId: string) => {
    if (shades[lineId]) return;
    const res = await fetch(`/api/translations/shades?color_line_id=${lineId}`);
    const data = await res.json();
    setShades((prev) => ({ ...prev, [lineId]: data.shades ?? [] }));
  }, [shades]);

  const toggleLine = (lineId: string) => {
    if (expandedLine === lineId) {
      setExpandedLine(null);
    } else {
      setExpandedLine(lineId);
      loadShades(lineId);
    }
  };

  // Group color lines by brand
  const brandGroups: Record<string, ColorLine[]> = {};
  for (const cl of colorLines) {
    if (!brandGroups[cl.brand]) brandGroups[cl.brand] = [];
    brandGroups[cl.brand].push(cl);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <header>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-dim)", marginBottom: "4px" }}>
            Translation Engine
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--text-on-stone)", fontWeight: 300 }}>
            Formula Translations
          </h2>
        </header>
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "48px 0" }}>
          Loading translation data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-dim)", marginBottom: "4px" }}>
          Translation Engine
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--text-on-stone)", fontWeight: 300 }}>
          Formula Translations
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "4px" }}>
          Infrastructure dashboard — data capture and catalog management
        </p>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Formulas" value={stats.totalFormulas} />
          <KPICard label="Total Outcomes" value={stats.totalOutcomes} />
          <KPICard label="With Photos" value={stats.formulasWithPhotos} />
          <KPICard label="With Feedback" value={stats.outcomesWithFeedback} />
        </div>
      )}

      {/* Color Line Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: "var(--text-on-stone-dim)" }} />
            Color Line Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(brandGroups).map(([brand, lines]) => (
            <div key={brand} style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-on-stone)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
                {brand}
              </p>
              {lines.map((line) => (
                <div key={line.id} style={{ marginBottom: "4px" }}>
                  <button
                    onClick={() => toggleLine(line.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "8px 12px", borderRadius: "6px", border: "none",
                      background: expandedLine === line.id ? "rgba(255,255,255,0.55)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {expandedLine === line.id
                      ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-faint)" }} />
                      : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-faint)" }} />
                    }
                    <span style={{ fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 500 }}>{line.lineName}</span>
                    <span style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", marginLeft: "4px" }}>
                      {line.type} · {line.shadeCount} shades
                    </span>
                  </button>
                  {expandedLine === line.id && shades[line.id] && (
                    <div style={{ padding: "8px 12px 8px 32px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "4px" }}>
                        {shades[line.id].map((s) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "4px 8px", borderRadius: "4px",
                              background: "rgba(255,255,255,0.4)",
                              fontSize: "10px", color: "var(--text-on-stone)",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{s.shadeCode}</span>
                            <span style={{ color: "var(--text-on-stone-faint)", marginLeft: "6px" }}>{s.shadeName}</span>
                            <span style={{ color: "var(--text-muted)", marginLeft: "6px" }}>L{s.level} {s.primaryTone}{s.secondaryTone ? `/${s.secondaryTone}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {colorLines.length === 0 && (
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
              No color lines loaded. Run the seed migration to populate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Outcome Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
              No translation outcomes recorded yet. Outcomes are auto-captured when services are completed with formulas.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {outcomes.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {o.outcomeSuccess === true && <CheckCircle className="w-4 h-4" style={{ color: "var(--status-confirmed)" }} />}
                    {o.outcomeSuccess === false && <XCircle className="w-4 h-4" style={{ color: "var(--garnet)" }} />}
                    {o.outcomeSuccess === null && <Clock className="w-4 h-4" style={{ color: "var(--text-on-stone-faint)" }} />}
                    <div>
                      <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                        {o.outcomeSuccess === true ? "Success" : o.outcomeSuccess === false ? "Needs Adjustment" : "Pending Feedback"}
                      </p>
                      {o.stylistFeedback && (
                        <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{o.stylistFeedback}</p>
                      )}
                      <p style={{ fontSize: "9px", color: "var(--text-muted)" }}>{formatDate(o.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality */}
      {dataQuality && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QualityBar label="Formulas with Photos" count={dataQuality.formulasWithPhotos} total={dataQuality.totalFormulas} pct={dataQuality.photoPct} />
            <QualityBar label="Outcomes with Feedback" count={dataQuality.outcomesWithFeedback} total={dataQuality.totalOutcomes} pct={dataQuality.feedbackPct} />
            <QualityBar label="Outcomes with Rating" count={dataQuality.outcomesWithRating} total={dataQuality.totalOutcomes} pct={dataQuality.ratingPct} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QualityBar({ label, count, total, pct }: { label: string; count: number; total: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between" style={{ marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-on-stone)" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>{count}/{total} ({pct}%)</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(0,0,0,0.06)" }}>
        <div
          style={{
            height: "100%", borderRadius: "3px", width: `${pct}%`,
            background: pct > 50 ? "var(--status-confirmed)" : pct > 20 ? "var(--brass)" : "var(--garnet)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
