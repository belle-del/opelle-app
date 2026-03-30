"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { X, Clock, CheckCircle, GraduationCap } from "lucide-react";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";
const GREEN = "#4A7C59";

const HOURS_REQUIRED = 1600;

interface CategoryProgress {
  id: string;
  name: string;
  code: string;
  requiredCount: number;
  completed: number;
}

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  verified: boolean;
}

interface Completion {
  id: string;
  completedAt: string;
  verified: boolean;
  categoryName: string;
}

interface StudentData {
  studentName: string;
  status: string;
  clockedInAt: string | null;
  totalHours: number;
  verifiedHours: number;
  categories: CategoryProgress[];
  recentEntries: TimeEntry[];
  recentCompletions: Completion[];
}

interface Props {
  studentId: string;
  onClose: () => void;
}

export function StudentProfilePanel({ studentId, onClose }: Props) {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/${studentId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hoursPct = data ? Math.min(100, (data.totalHours / HOURS_REQUIRED) * 100) : 0;

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
        zIndex: 998, transition: "opacity 0.2s ease",
      }} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(420px, 90vw)", background: CREAM,
          borderLeft: `1px solid ${STONE_MID}`,
          zIndex: 999, overflowY: "auto",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
          animation: "slideIn 0.2s ease",
        }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 16px", borderBottom: `1px solid ${STONE_MID}`,
          position: "sticky", top: 0, background: CREAM, zIndex: 1,
        }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
            {loading ? "Loading..." : data?.studentName || "Student Profile"}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${STONE_MID}`,
              background: "transparent", cursor: "pointer",
            }}
          >
            <X size={16} color={TEXT_FAINT} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT_FAINT, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            Loading student data...
          </div>
        ) : data ? (
          <div style={{ padding: 20 }}>
            {/* Status */}
            <div style={{ marginBottom: 20 }}>
              <Badge variant={
                data.status === "available" ? "success" :
                data.status === "with_client" ? "warning" :
                data.status === "on_break" ? "danger" : "default"
              }>
                {data.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            {/* Hours */}
            <div style={{
              background: GARNET, borderRadius: 10, padding: 16, marginBottom: 16, color: "#fff",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, opacity: 0.7, margin: "0 0 2px", letterSpacing: "0.04em" }}>
                    TOTAL HOURS
                  </p>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, margin: 0 }}>
                    {data.totalHours.toFixed(1)}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>
                  / {HOURS_REQUIRED} required
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: hoursPct >= 100 ? GREEN : BRASS,
                  width: `${hoursPct}%`,
                }} />
              </div>
              <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", opacity: 0.6, margin: "6px 0 0" }}>
                {hoursPct.toFixed(1)}% complete — {(HOURS_REQUIRED - data.totalHours).toFixed(1)} hrs remaining
              </p>
            </div>

            {/* Curriculum Progress */}
            {data.categories.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500,
                  color: TEXT_MAIN, margin: "0 0 12px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <GraduationCap size={16} /> Curriculum Progress
                </h3>
                {data.categories.map((cat) => {
                  const pct = cat.requiredCount > 0 ? Math.min(100, (cat.completed / cat.requiredCount) * 100) : 0;
                  return (
                    <div key={cat.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: TEXT_MAIN }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: TEXT_FAINT }}>
                          {cat.completed} / {cat.requiredCount}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: STONE, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: pct >= 100 ? GREEN : BRASS,
                          width: `${pct}%`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Time Entries */}
            {data.recentEntries.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500,
                  color: TEXT_MAIN, margin: "0 0 10px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Clock size={16} /> Recent Clock Sessions
                </h3>
                <div style={{ background: STONE, borderRadius: 8, overflow: "hidden" }}>
                  {data.recentEntries.map((entry, i) => {
                    const d = new Date(entry.clockIn);
                    const duration = entry.durationMinutes
                      ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                      : "Active";
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "8px 12px", fontSize: 12,
                          fontFamily: "'DM Sans', sans-serif",
                          borderBottom: i < data.recentEntries.length - 1 ? `1px solid ${STONE_MID}` : "none",
                        }}
                      >
                        <span style={{ color: TEXT_MAIN }}>
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                          {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span style={{ fontWeight: 600, color: entry.clockOut ? BRASS : GARNET }}>
                          {duration}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Completions */}
            {data.recentCompletions.length > 0 && (
              <div>
                <h3 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500,
                  color: TEXT_MAIN, margin: "0 0 10px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <CheckCircle size={16} /> Recent Services
                </h3>
                <div style={{ background: STONE, borderRadius: 8, overflow: "hidden" }}>
                  {data.recentCompletions.map((c, i) => {
                    const d = new Date(c.completedAt);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "8px 12px", fontSize: 12,
                          fontFamily: "'DM Sans', sans-serif",
                          borderBottom: i < data.recentCompletions.length - 1 ? `1px solid ${STONE_MID}` : "none",
                        }}
                      >
                        <span style={{ color: TEXT_MAIN }}>{c.categoryName}</span>
                        <span style={{ color: TEXT_FAINT }}>
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: TEXT_FAINT, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            Failed to load student data.
          </div>
        )}
      </div>
    </>
  );
}
