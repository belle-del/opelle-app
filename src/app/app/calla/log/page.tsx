"use client";
import { useState, useEffect, useCallback } from "react";
import { BookOpen, Briefcase, Star, Clock, FileText } from "lucide-react";
import ClassroomLogForm from "../_components/ClassroomLogForm";
import FloorLogForm from "../_components/FloorLogForm";
import CallaNav from "../_components/CallaNav";

/* ─── Design tokens ──────────────────────────────────────────────── */

const GARNET = "#6B2737";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";
const BRASS = "#B08D57";

/* ─── Types ──────────────────────────────────────────────────────── */

interface LogEntry {
  id: string;
  type: "classroom" | "floor";
  techniqueName?: string;
  serviceType?: string;
  selfAssessment?: number;
  notes?: string;
  outcomeNotes?: string;
  createdAt?: string;
  created_at?: string;
}

/* ─── Log card ───────────────────────────────────────────────────── */

function LogCard({ log }: { log: LogEntry }) {
  const name = log.type === "classroom" ? log.techniqueName : log.serviceType;
  const dateStr = log.createdAt || log.created_at || "";
  const preview = log.type === "classroom" ? log.notes : log.outcomeNotes;

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "14px 16px",
        background: "#fff",
        border: `1px solid ${STONE}`,
        borderRadius: "10px",
        alignItems: "flex-start",
      }}
    >
      {/* Type icon */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: log.type === "classroom" ? `${GARNET}14` : `${BRASS}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {log.type === "classroom" ? (
          <BookOpen size={15} style={{ color: GARNET }} />
        ) : (
          <Briefcase size={15} style={{ color: BRASS }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + date row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: TEXT_PRIMARY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name || "Untitled"}
          </span>
          {dateStr && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                color: TEXT_FAINT,
                flexShrink: 0,
              }}
            >
              {new Date(dateStr).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Stars */}
        {log.type === "classroom" && log.selfAssessment != null && (
          <div style={{ display: "flex", gap: "2px", margin: "4px 0" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={12}
                fill={s <= log.selfAssessment! ? BRASS : "none"}
                stroke={s <= log.selfAssessment! ? BRASS : STONE}
                strokeWidth={1.5}
              />
            ))}
          </div>
        )}

        {/* Notes preview */}
        {preview && (
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: TEXT_FAINT,
              margin: "4px 0 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {preview}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function LogPage() {
  const [activeTab, setActiveTab] = useState<"classroom" | "floor">("classroom");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/calla/logs");
      if (!res.ok) return;
      const data = await res.json();
      setLogs(
        (data.logs || []).slice(0, 10).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          type: l.type as "classroom" | "floor",
          techniqueName: l.technique_name || l.techniqueName,
          serviceType: l.service_type || l.serviceType,
          selfAssessment: l.self_assessment ?? l.selfAssessment,
          notes: l.notes,
          outcomeNotes: l.outcome_notes || l.outcomeNotes,
          createdAt: l.created_at || l.createdAt,
        })) as LogEntry[]
      );
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSuccess = () => {
    fetchLogs();
  };

  const TABS: { key: "classroom" | "floor"; label: string }[] = [
    { key: "classroom", label: "Classroom" },
    { key: "floor", label: "Floor" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        background: "#FAFAF5",
        overflow: "hidden",
      }}
    >
      <CallaNav />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          maxWidth: "640px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Page heading */}
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "22px",
            fontWeight: 500,
            color: TEXT_PRIMARY,
            margin: "0 0 20px",
          }}
        >
          Log Practice
        </h1>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: "0",
            borderBottom: `1px solid ${STONE}`,
            marginBottom: "24px",
          }}
        >
          {TABS.map(({ key, label }) => {
            const active = key === activeTab;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 600 : 400,
                  color: active ? GARNET : TEXT_FAINT,
                  background: "none",
                  border: "none",
                  borderBottom: active
                    ? `2px solid ${GARNET}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = TEXT_PRIMARY;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = TEXT_FAINT;
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Active form */}
        {activeTab === "classroom" ? (
          <ClassroomLogForm onSuccess={handleSuccess} />
        ) : (
          <FloorLogForm onSuccess={handleSuccess} />
        )}

        {/* Recent logs */}
        <div style={{ marginTop: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Clock size={15} style={{ color: TEXT_FAINT }} />
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "16px",
                fontWeight: 500,
                color: TEXT_PRIMARY,
                margin: 0,
              }}
            >
              Recent Logs
            </h2>
          </div>

          {loading && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: TEXT_FAINT,
              }}
            >
              Loading...
            </p>
          )}

          {!loading && logs.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                background: CREAM,
                borderRadius: "10px",
                border: `1px solid ${STONE}`,
              }}
            >
              <FileText
                size={28}
                style={{ color: TEXT_FAINT, marginBottom: "8px" }}
              />
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: TEXT_FAINT,
                  margin: 0,
                }}
              >
                No logs yet. Start logging your practice!
              </p>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
