"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, ChevronDown, ChevronUp, Plus } from "lucide-react";
import BeforeAfterCapture from "@/components/BeforeAfterCapture";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";
const GREEN = "#4A7C59";

interface Category {
  id: string;
  name: string;
  code: string;
  requiredCount: number;
  requires_photos: boolean;
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  categories: Record<string, { completed: number; verified: number }>;
}

interface Completion {
  id: string;
  studentId: string;
  studentName: string;
  categoryName: string;
  completedAt: string;
  verified: boolean;
}

interface Props {
  initialCategories: Category[];
  initialStudents: StudentProgress[];
  initialCompletions: Completion[];
}

export function ProgressDashboard({ initialCategories, initialStudents, initialCompletions }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [students, setStudents] = useState(initialStudents);
  const [completions, setCompletions] = useState(initialCompletions);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logStudentId, setLogStudentId] = useState("");
  const [logCategoryId, setLogCategoryId] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [photosRequired, setPhotosRequired] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<{
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
  }>({});

  const photosReady = !photosRequired
    || (!!capturedPhotos.beforePhotoUrl && !!capturedPhotos.afterPhotoUrl);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/curriculum");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setStudents(data.students || []);
        setCompletions(data.recentCompletions || []);
      }
    } catch { /* silent */ }
  }, []);

  async function logCompletion() {
    if (!logStudentId || !logCategoryId) return;
    setLogLoading(true);
    try {
      const student = students.find((s) => s.studentId === logStudentId);
      await fetch("/api/services/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: logStudentId,
          studentName: student?.studentName || "",
          categoryId: logCategoryId,
          beforePhotoUrl: capturedPhotos.beforePhotoUrl,
          afterPhotoUrl: capturedPhotos.afterPhotoUrl,
        }),
      });
      await refresh();
      setLogOpen(false);
      setLogStudentId("");
      setLogCategoryId("");
      setPhotosRequired(false);
      setCapturedPhotos({});
    } finally {
      setLogLoading(false);
    }
  }

  function getStudentOverallProgress(student: StudentProgress): number {
    if (categories.length === 0) return 0;
    let totalRequired = 0;
    let totalCompleted = 0;
    for (const cat of categories) {
      totalRequired += cat.requiredCount;
      totalCompleted += Math.min(student.categories[cat.id]?.completed || 0, cat.requiredCount);
    }
    return totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
            Curriculum Progress
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_FAINT, margin: "4px 0 0" }}>
            {categories.length} service categories tracked
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (logOpen) {
                setPhotosRequired(false);
                setCapturedPhotos({});
              }
              setLogOpen(!logOpen);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: GARNET, color: "#fff", fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Plus size={14} /> Log Service
          </button>
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
      </div>

      {/* Log service modal */}
      {logOpen && (
        <div style={{
          background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 12px" }}>
            Log Service Completion
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: TEXT_FAINT, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Student</label>
              <select
                value={logStudentId}
                onChange={(e) => setLogStudentId(e.target.value)}
                style={{
                  padding: "8px 12px", borderRadius: 6, border: `1px solid ${STONE_MID}`,
                  background: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  minWidth: 180,
                }}
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>{s.studentName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: TEXT_FAINT, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Service Category</label>
              <select
                value={logCategoryId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setLogCategoryId(newId);
                  const cat = categories.find((c) => c.id === newId);
                  setPhotosRequired(cat?.requires_photos ?? false);
                  setCapturedPhotos({});
                }}
                style={{
                  padding: "8px 12px", borderRadius: 6, border: `1px solid ${STONE_MID}`,
                  background: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  minWidth: 180,
                }}
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {photosRequired && (
              <div style={{ marginTop: 12 }}>
                <p style={{
                  fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "#8A8778", marginBottom: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Before &amp; After Photos <span style={{ color: "#9E5A5A" }}>*</span>
                </p>
                <BeforeAfterCapture
                  required={photosRequired}
                  onPhotosChange={setCapturedPhotos}
                />
              </div>
            )}
            <button
              onClick={logCompletion}
              disabled={logLoading || !logStudentId || !logCategoryId || !photosReady}
              style={{
                padding: "8px 16px", borderRadius: 6, border: "none",
                background: BRASS, color: "#fff", fontSize: 13, fontWeight: 500,
                cursor: logLoading ? "not-allowed" : "pointer",
                opacity: (!logStudentId || !logCategoryId || !photosReady) ? 0.5 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {logLoading
                ? "Logging..."
                : (photosRequired && !photosReady)
                  ? "Add Photos to Continue"
                  : "Log Service"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, color: TEXT_FAINT,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          background: CREAM, borderRadius: 12, border: `1px solid ${STONE_MID}`,
        }}>
          No service categories configured. Seed categories from the setup page.
        </div>
      ) : (
        <>
          {/* Student progress grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}>
            {students.map((student) => {
              const overall = getStudentOverallProgress(student);
              const isExpanded = expandedStudent === student.studentId;

              return (
                <div
                  key={student.studentId}
                  style={{
                    background: CREAM, border: `1px solid ${STONE_MID}`,
                    borderRadius: 12, overflow: "hidden",
                  }}
                >
                  {/* Student header */}
                  <button
                    onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
                    style={{
                      width: "100%", padding: 16, border: "none", background: "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "space-between", textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Mini progress circle */}
                      <div style={{ position: "relative", width: 40, height: 40 }}>
                        <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={20} cy={20} r={16} fill="none" stroke={STONE} strokeWidth={4} />
                          <circle
                            cx={20} cy={20} r={16} fill="none"
                            stroke={overall >= 100 ? GREEN : BRASS}
                            strokeWidth={4}
                            strokeDasharray={`${(overall / 100) * 100.5} 100.5`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span style={{
                          position: "absolute", top: "50%", left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: 9, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                          color: TEXT_MAIN,
                        }}>
                          {Math.round(overall)}%
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: TEXT_MAIN }}>
                        {student.studentName}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color={TEXT_FAINT} /> : <ChevronDown size={16} color={TEXT_FAINT} />}
                  </button>

                  {/* Category breakdown (expanded) */}
                  {isExpanded && (
                    <div style={{ padding: "0 16px 16px" }}>
                      {categories.map((cat) => {
                        const prog = student.categories[cat.id];
                        const completed = prog?.completed || 0;
                        const pct = cat.requiredCount > 0 ? Math.min(100, (completed / cat.requiredCount) * 100) : 0;

                        return (
                          <div key={cat.id} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: TEXT_MAIN }}>
                                {cat.name}
                              </span>
                              <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: TEXT_FAINT }}>
                                {completed} / {cat.requiredCount}
                              </span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: STONE, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                background: pct >= 100 ? GREEN : BRASS,
                                width: `${pct}%`,
                                transition: "width 0.3s ease",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent completions */}
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, marginBottom: 16 }}>
            Recent Completions
          </h2>
          {completions.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 40, color: TEXT_FAINT,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14,
              background: CREAM, borderRadius: 12, border: `1px solid ${STONE_MID}`,
            }}>
              No services completed yet. Use &quot;Log Service&quot; to record completions.
            </div>
          ) : (
            <div style={{
              background: CREAM, border: `1px solid ${STONE_MID}`,
              borderRadius: 12, overflow: "hidden",
            }}>
              {completions.map((c, i) => {
                const date = new Date(c.completedAt);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: i < completions.length - 1 ? `1px solid ${STONE_MID}` : "none",
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_MAIN, fontWeight: 500 }}>
                        {c.studentName}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT_FAINT, marginLeft: 8 }}>
                        {c.categoryName}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT_FAINT }}>
                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {c.verified && (
                        <Badge variant="success">
                          <CheckCircle size={10} style={{ marginRight: 2 }} /> VERIFIED
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
