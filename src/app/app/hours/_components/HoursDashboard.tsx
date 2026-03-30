"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, RefreshCw } from "lucide-react";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";

// Default state requirement — made configurable per Build Bible Rule 2
const DEFAULT_HOURS_REQUIRED = 1600;

interface StudentTotal {
  studentId: string;
  studentName: string;
  totalHours: number;
  verifiedHours: number;
  lastUpdated: string;
}

interface TimeEntry {
  id: string;
  studentId: string;
  studentName: string;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  verified: boolean;
}

interface HoursDashboardProps {
  initialTotals: StudentTotal[];
  initialEntries: TimeEntry[];
  hoursRequired?: number;
}

export function HoursDashboard({ initialTotals, initialEntries, hoursRequired = DEFAULT_HOURS_REQUIRED }: HoursDashboardProps) {
  const [totals, setTotals] = useState<StudentTotal[]>(initialTotals);
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hours");
      if (res.ok) {
        const data = await res.json();
        setTotals(data.totals || []);
        setEntries(data.recentEntries || []);
      }
    } catch { /* silent */ }
  }, []);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const totalAllHours = totals.reduce((sum, t) => sum + t.totalHours, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
            Hour Tracking
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_FAINT, margin: "4px 0 0" }}>
            {totals.length} student{totals.length !== 1 ? "s" : ""} tracking hours
          </p>
        </div>
        <button
          onClick={refresh}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${STONE_MID}`,
            background: CREAM, color: TEXT_MAIN, fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary card */}
      {totals.length > 0 && (
        <div style={{
          background: GARNET, borderRadius: 12, padding: 24, marginBottom: 24,
          color: "#fff",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, opacity: 0.7, margin: "0 0 4px", letterSpacing: "0.04em" }}>
                TOTAL HOURS LOGGED
              </p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 42, fontWeight: 600, margin: 0 }}>
                {totalAllHours.toFixed(1)}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, opacity: 0.7, margin: "0 0 4px" }}>
                ACROSS {totals.length} STUDENTS
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: 0 }}>
                Requirement: {hoursRequired} hrs each
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student progress cards */}
      {totals.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, marginBottom: 16 }}>
            Student Progress
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {totals.map((student) => {
              const pct = Math.min(100, (student.totalHours / hoursRequired) * 100);
              return (
                <div
                  key={student.studentId}
                  style={{
                    background: CREAM, border: `1px solid ${STONE_MID}`,
                    borderRadius: 12, padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: TEXT_MAIN }}>
                      {student.studentName}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: BRASS }}>
                      {student.totalHours.toFixed(1)} hrs
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 8, borderRadius: 4, background: STONE,
                    overflow: "hidden", marginBottom: 6,
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: pct >= 100 ? "#4A7C59" : BRASS,
                      width: `${pct}%`,
                      transition: "width 0.3s ease",
                    }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT_FAINT }}>
                      {pct.toFixed(1)}% of {hoursRequired} hrs
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT_FAINT }}>
                      {(hoursRequired - student.totalHours).toFixed(1)} hrs remaining
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: 60, color: TEXT_FAINT,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          background: CREAM, borderRadius: 12, border: `1px solid ${STONE_MID}`,
          marginBottom: 32,
        }}>
          No hours logged yet. Clock students in and out from the Floor View to start tracking.
        </div>
      )}

      {/* Recent time entries */}
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, marginBottom: 16 }}>
        Recent Clock Sessions
      </h2>

      {entries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 40, color: TEXT_FAINT,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          background: CREAM, borderRadius: 12, border: `1px solid ${STONE_MID}`,
        }}>
          No time entries yet.
        </div>
      ) : (
        <div style={{
          background: CREAM, border: `1px solid ${STONE_MID}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {entries.map((entry, i) => {
            const clockIn = new Date(entry.clockIn);
            const dateStr = clockIn.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeStr = clockIn.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const duration = entry.durationMinutes
              ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
              : "In progress";

            return (
              <div
                key={entry.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: i < entries.length - 1 ? `1px solid ${STONE_MID}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Clock size={14} color={TEXT_FAINT} />
                  <div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_MAIN, fontWeight: 500 }}>
                      {entry.studentName}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT_FAINT, marginLeft: 8 }}>
                      {dateStr} at {timeStr}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    fontWeight: 600, color: entry.clockOut ? BRASS : GARNET,
                  }}>
                    {duration}
                  </span>
                  {entry.verified && (
                    <Badge variant="success">
                      <CheckCircle size={10} style={{ marginRight: 2 }} /> VERIFIED
                    </Badge>
                  )}
                  {!entry.clockOut && (
                    <Badge variant="warning">ACTIVE</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
