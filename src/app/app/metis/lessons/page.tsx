"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Trash2, ToggleLeft, ToggleRight, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Lesson {
  id: string;
  lesson: string;
  category: string;
  entityType?: string;
  entityId?: string;
  confidence: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Feedback {
  id: string;
  source: string;
  originalContent?: string;
  correction?: string;
  feedbackType: string;
  entityType?: string;
  createdAt: string;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const GARNET = "#6B2737";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";

const CATEGORY_LABELS: Record<string, string> = {
  client_preference: "Client Preference",
  product_knowledge: "Product Knowledge",
  technique: "Technique",
  business: "Business",
  preference: "Preference",
  general: "General",
};

const CATEGORY_COLORS: Record<string, string> = {
  client_preference: "#8FADC8",
  product_knowledge: "#C4AB70",
  technique: "#6B2737",
  business: "#555744",
  preference: "#8FADC8",
  general: "#8A8A7A",
};

/* ─── Page ───────────────────────────────────────────────────────── */

export default function MetisLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [distilling, setDistilling] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLesson, setNewLesson] = useState("");
  const [newCategory, setNewCategory] = useState("client_preference");
  const [tab, setTab] = useState<"lessons" | "feedback">("lessons");

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/lessons?activeOnly=false");
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/feedback");
      const data = await res.json();
      setFeedback(data.feedback || []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchLessons(), fetchFeedback()]).finally(() => setLoading(false));
  }, [fetchLessons, fetchFeedback]);

  const handleDistill = async () => {
    setDistilling(true);
    try {
      const res = await fetch("/api/intelligence/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "distill" }),
      });
      const data = await res.json();
      if (data.lessons?.length) {
        await fetchLessons();
      }
    } catch {
      // Silently fail
    } finally {
      setDistilling(false);
    }
  };

  const handleAddLesson = async () => {
    if (!newLesson.trim()) return;
    try {
      await fetch("/api/intelligence/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          lesson: newLesson.trim(),
          category: newCategory,
        }),
      });
      setNewLesson("");
      setShowAddForm(false);
      await fetchLessons();
    } catch {
      // Silently fail
    }
  };

  const handleToggleActive = async (lesson: Lesson) => {
    try {
      await fetch("/api/intelligence/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lesson.id, active: !lesson.active }),
      });
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, active: !l.active } : l))
      );
    } catch {
      // Silently fail
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await fetch(`/api/intelligence/lessons?id=${id}`, { method: "DELETE" });
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // Silently fail
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await fetch(`/api/intelligence/feedback?id=${id}`, { method: "DELETE" });
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // Silently fail
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link
          href="/app/metis"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: `1px solid ${STONE}`,
            background: CREAM,
            color: TEXT_PRIMARY,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "22px",
              fontWeight: 500,
              color: TEXT_PRIMARY,
              margin: 0,
            }}
          >
            Metis Memory
          </h1>
          <p style={{ fontSize: "12px", color: TEXT_FAINT, margin: "2px 0 0" }}>
            What Metis has learned from your feedback
          </p>
        </div>
        <BookOpen size={20} style={{ color: BRASS }} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "16px", background: STONE, borderRadius: "8px", padding: "2px" }}>
        {(["lessons", "feedback"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 500,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: tab === t ? CREAM : "transparent",
              color: tab === t ? TEXT_PRIMARY : TEXT_FAINT,
              transition: "all 0.15s",
              textTransform: "capitalize",
            }}
          >
            {t} ({t === "lessons" ? lessons.length : feedback.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: TEXT_FAINT, fontSize: "12px" }}>
          Loading...
        </div>
      ) : tab === "lessons" ? (
        <>
          {/* Action bar */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "11px",
                border: `1px solid ${BRASS}`,
                borderRadius: "8px",
                background: "transparent",
                color: GARNET,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${BRASS}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={12} /> Add Lesson
            </button>
            <button
              onClick={handleDistill}
              disabled={distilling || feedback.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "11px",
                border: `1px solid ${BRASS}`,
                borderRadius: "8px",
                background: distilling ? STONE : BRASS,
                color: distilling ? TEXT_FAINT : "#fff",
                cursor: distilling || feedback.length === 0 ? "default" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {distilling ? (
                <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Sparkles size={12} />
              )}
              {distilling ? "Distilling..." : "Auto-Distill from Feedback"}
            </button>
          </div>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {/* Add lesson form */}
          {showAddForm && (
            <div
              style={{
                background: CREAM,
                border: `1px solid ${STONE}`,
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <textarea
                value={newLesson}
                onChange={(e) => setNewLesson(e.target.value)}
                placeholder="e.g., Client Sarah prefers low-ammonia products due to scalp sensitivity"
                rows={2}
                style={{
                  width: "100%",
                  border: `1px solid ${STONE}`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  resize: "none",
                  outline: "none",
                  background: "#FAFAF5",
                  color: TEXT_PRIMARY,
                  marginBottom: "8px",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = BRASS; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = STONE; }}
              />
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    border: `1px solid ${STONE}`,
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: "#FAFAF5",
                    color: TEXT_PRIMARY,
                    outline: "none",
                  }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setShowAddForm(false); setNewLesson(""); }}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    border: `1px solid ${STONE}`,
                    borderRadius: "6px",
                    background: "transparent",
                    color: TEXT_FAINT,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLesson}
                  disabled={!newLesson.trim()}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    border: "none",
                    borderRadius: "6px",
                    background: newLesson.trim() ? BRASS : STONE,
                    color: newLesson.trim() ? "#fff" : TEXT_FAINT,
                    cursor: newLesson.trim() ? "pointer" : "default",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Lessons list */}
          {lessons.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: TEXT_FAINT,
                background: CREAM,
                borderRadius: "10px",
                border: `1px solid ${STONE}`,
              }}
            >
              <BookOpen size={24} style={{ color: BRASS, marginBottom: "8px" }} />
              <p style={{ fontSize: "13px", margin: "0 0 4px" }}>No lessons yet</p>
              <p style={{ fontSize: "11px" }}>
                Teach Metis by clicking the &quot;Teach&quot; button on any response, or add lessons manually.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  style={{
                    background: CREAM,
                    border: `1px solid ${STONE}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    opacity: lesson.active ? 1 : 0.5,
                    transition: "opacity 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", lineHeight: 1.5, color: TEXT_PRIMARY, margin: "0 0 6px" }}>
                        {lesson.lesson}
                      </p>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 8px",
                            borderRadius: "10px",
                            background: `${CATEGORY_COLORS[lesson.category] || BRASS}20`,
                            color: CATEGORY_COLORS[lesson.category] || BRASS,
                            fontWeight: 500,
                          }}
                        >
                          {CATEGORY_LABELS[lesson.category] || lesson.category}
                        </span>
                        <span style={{ fontSize: "9px", color: TEXT_FAINT }}>
                          {new Date(lesson.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggleActive(lesson)}
                        title={lesson.active ? "Deactivate" : "Activate"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: lesson.active ? BRASS : TEXT_FAINT,
                          padding: "2px",
                        }}
                      >
                        {lesson.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        title="Delete"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: TEXT_FAINT,
                          padding: "2px",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = GARNET; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_FAINT; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Feedback tab */
        <>
          {feedback.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: TEXT_FAINT,
                background: CREAM,
                borderRadius: "10px",
                border: `1px solid ${STONE}`,
              }}
            >
              <p style={{ fontSize: "13px", margin: "0 0 4px" }}>No feedback yet</p>
              <p style={{ fontSize: "11px" }}>
                Use the &quot;Teach&quot; button on Metis responses to provide corrections, notes, or preferences.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    background: CREAM,
                    border: `1px solid ${STONE}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      {fb.originalContent && (
                        <p
                          style={{
                            fontSize: "10px",
                            color: TEXT_FAINT,
                            margin: "0 0 4px",
                            fontStyle: "italic",
                            lineHeight: 1.4,
                          }}
                        >
                          Metis said: &quot;{fb.originalContent.length > 100
                            ? fb.originalContent.substring(0, 100) + "..."
                            : fb.originalContent}&quot;
                        </p>
                      )}
                      <p style={{ fontSize: "12px", lineHeight: 1.5, color: TEXT_PRIMARY, margin: "0 0 6px" }}>
                        {fb.correction || "(no correction text)"}
                      </p>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 8px",
                            borderRadius: "10px",
                            background: `${BRASS}20`,
                            color: BRASS,
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {fb.feedbackType}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 8px",
                            borderRadius: "10px",
                            background: `${STONE}`,
                            color: TEXT_FAINT,
                          }}
                        >
                          {fb.source}
                        </span>
                        <span style={{ fontSize: "9px", color: TEXT_FAINT }}>
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(fb.id)}
                      title="Delete"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: TEXT_FAINT,
                        padding: "2px",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = GARNET; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_FAINT; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
