"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_BLUSH = "#F5E1E5";
const GARNET_VIVID = "#B52249";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const OLIVE = "#6B7F4E";
const BRASS = "#C4AB70";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Types ─────────────────────────────────────────────────────── */

interface TestQuestion {
  id: string;
  domain: string;
  topic: string;
  questionText: string;
  options: string[];
  difficulty: number;
}

interface TestSubmitResult {
  score: {
    overall: number;
    byDomain: Record<
      string,
      { attempted: number; correct: number; accuracy: number }
    >;
  };
  passed: boolean;
  xp: {
    xpEarned: number;
    newTotal: number;
    leveledUp: boolean;
    newLevel: number;
  };
  newAchievements: Array<{ achievementKey: string; earnedAt: string }>;
}

interface PracticeTestProps {
  questions: TestQuestion[];
  conversationId: string;
  testSessionId: string;
  timeLimit: number; // minutes
  onComplete: (results: TestSubmitResult) => void;
  onExit: () => void;
}

/* ─── Option labels ─────────────────────────────────────────────── */

const OPTION_LABELS = ["A", "B", "C", "D"];

/* ─── Timer formatting ──────────────────────────────────────────── */

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function PracticeTest({
  questions,
  conversationId,
  testSessionId,
  timeLimit,
  onComplete,
  onExit,
}: PracticeTestProps) {
  const total = questions.length;

  /* State */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(timeLimit * 60);
  const [showGrid, setShowGrid] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmitted = useRef(false);

  /* Timer */
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* Auto-submit when timer hits 0 */
  useEffect(() => {
    if (secondsLeft === 0 && !hasSubmitted.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = total - answeredCount;
  const timerDanger = secondsLeft < 300; // under 5 minutes

  /* Answer selection */
  const selectAnswer = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  /* Flag toggle */
  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  /* Navigation */
  const goTo = (index: number) => {
    setCurrentIndex(index);
    setShowGrid(false);
  };

  /* Submit */
  const handleSubmit = useCallback(async () => {
    if (hasSubmitted.current || submitting) return;
    hasSubmitted.current = true;
    setSubmitting(true);
    setShowConfirm(false);

    try {
      const res = await fetch("/api/calla/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          testSessionId,
          answers,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");
      const data: TestSubmitResult = await res.json();
      onComplete(data);
    } catch {
      // If submit fails, allow retry
      hasSubmitted.current = false;
      setSubmitting(false);
    }
  }, [answers, conversationId, testSessionId, onComplete, submitting]);

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "#fff",
        fontFamily: FONT_BODY,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: `1px solid ${STONE_LIGHT}`,
          flexShrink: 0,
        }}
      >
        {/* Timer */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "monospace",
            color: timerDanger ? GARNET_VIVID : BARK_DEEPEST,
            minWidth: "70px",
          }}
        >
          {formatTime(secondsLeft)}
        </div>

        {/* Question counter */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "13px",
              color: TEXT_FAINT,
              fontWeight: 500,
            }}
          >
            {currentIndex + 1} / {total}
          </span>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((p) => !p)}
            style={{
              background: showGrid ? `${GARNET}12` : "transparent",
              border: `1px solid ${STONE_LIGHT}`,
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 500,
              color: BARK_DEEPEST,
              cursor: "pointer",
              fontFamily: FONT_BODY,
            }}
          >
            Grid
          </button>

          {/* Submit */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            style={{
              background: GARNET,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              fontFamily: FONT_BODY,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        {/* Exit */}
        <button
          onClick={onExit}
          style={{
            background: "none",
            border: "none",
            fontSize: "13px",
            color: TEXT_FAINT,
            cursor: "pointer",
            fontFamily: FONT_BODY,
            fontWeight: 500,
          }}
        >
          Exit
        </button>
      </div>

      {/* ─── Question grid overlay ───────────────────────────────── */}
      {showGrid && (
        <div
          style={{
            position: "absolute",
            top: "52px",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.97)",
            zIndex: 10,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: BARK_DEEPEST,
              marginBottom: "16px",
            }}
          >
            Question Navigator
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
              gap: "6px",
              maxWidth: "600px",
            }}
          >
            {questions.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === currentIndex;
              const isFlagged = flagged.has(q.id);

              let bg = "transparent";
              let border = `1px solid ${STONE_LIGHT}`;
              let color = BARK_DEEPEST;

              if (isCurrent) {
                bg = `${GARNET}15`;
                border = `2px solid ${GARNET}`;
                color = GARNET;
              } else if (isFlagged) {
                bg = `${BRASS}25`;
                border = `1px solid ${BRASS}`;
              } else if (isAnswered) {
                bg = `${OLIVE}15`;
                border = `1px solid ${OLIVE}60`;
              }

              return (
                <button
                  key={q.id}
                  onClick={() => goTo(i)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    background: bg,
                    border,
                    color,
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONT_BODY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "20px",
              fontSize: "10px",
              color: TEXT_FAINT,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "3px",
                  background: `${OLIVE}15`,
                  border: `1px solid ${OLIVE}60`,
                  display: "inline-block",
                }}
              />
              Answered
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "3px",
                  background: `${GARNET}15`,
                  border: `2px solid ${GARNET}`,
                  display: "inline-block",
                }}
              />
              Current
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "3px",
                  background: `${BRASS}25`,
                  border: `1px solid ${BRASS}`,
                  display: "inline-block",
                }}
              />
              Flagged
            </span>
          </div>
        </div>
      )}

      {/* ─── Question area ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "600px", width: "100%" }}>
          {/* Domain / Topic */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: TEXT_FAINT,
                background: STONE_LIGHT,
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {currentQuestion.domain} &middot; {currentQuestion.topic}
            </span>

            {/* Flag button */}
            <button
              onClick={toggleFlag}
              style={{
                background: flagged.has(currentQuestion.id)
                  ? `${BRASS}30`
                  : "transparent",
                border: `1px solid ${
                  flagged.has(currentQuestion.id) ? BRASS : STONE_LIGHT
                }`,
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 500,
                color: flagged.has(currentQuestion.id)
                  ? BARK_DEEPEST
                  : TEXT_FAINT,
                cursor: "pointer",
                fontFamily: FONT_BODY,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {flagged.has(currentQuestion.id) ? "\u2605" : "\u2606"} Flag
            </button>
          </div>

          {/* Question text */}
          <p
            style={{
              fontSize: "17px",
              fontWeight: 600,
              lineHeight: 1.6,
              color: BARK_DEEPEST,
              margin: "0 0 28px",
              fontFamily: FONT_DISPLAY,
            }}
          >
            {currentQuestion.questionText}
          </p>

          {/* Options */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === option;

              return (
                <button
                  key={index}
                  onClick={() => selectAnswer(option)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: isSelected
                      ? `2px solid ${GARNET}`
                      : `1px solid ${STONE_LIGHT}`,
                    background: isSelected ? `${GARNET}08` : "#fff",
                    color: BARK_DEEPEST,
                    fontSize: "14px",
                    fontFamily: FONT_BODY,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s ease",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: isSelected
                        ? `2px solid ${GARNET}`
                        : `1px solid ${STONE_LIGHT}`,
                      background: isSelected ? GARNET : "#fff",
                      color: isSelected ? "#fff" : TEXT_FAINT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: "all 0.12s ease",
                    }}
                  >
                    {OPTION_LABELS[index]}
                  </span>
                  <span style={{ flex: 1 }}>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Footer navigation ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
          borderTop: `1px solid ${STONE_LIGHT}`,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
          disabled={currentIndex === 0}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: `1px solid ${STONE_LIGHT}`,
            background: currentIndex === 0 ? STONE_LIGHT : "#fff",
            color: currentIndex === 0 ? TEXT_FAINT : BARK_DEEPEST,
            fontSize: "13px",
            fontWeight: 500,
            cursor: currentIndex === 0 ? "default" : "pointer",
            fontFamily: FONT_BODY,
          }}
        >
          Previous
        </button>

        <span
          style={{
            fontSize: "11px",
            color: TEXT_FAINT,
          }}
        >
          {answeredCount} of {total} answered
        </span>

        <button
          onClick={() =>
            setCurrentIndex((p) => Math.min(total - 1, p + 1))
          }
          disabled={currentIndex === total - 1}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            background:
              currentIndex === total - 1 ? STONE_LIGHT : GARNET,
            color: currentIndex === total - 1 ? TEXT_FAINT : "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: currentIndex === total - 1 ? "default" : "pointer",
            fontFamily: FONT_BODY,
          }}
        >
          Next
        </button>
      </div>

      {/* ─── Submit confirmation modal ───────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "28px 24px",
              maxWidth: "380px",
              width: "90%",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: BARK_DEEPEST,
                margin: "0 0 8px",
                fontFamily: FONT_DISPLAY,
              }}
            >
              Submit Practice Test?
            </p>
            {unansweredCount > 0 && (
              <p
                style={{
                  fontSize: "13px",
                  color: GARNET_VIVID,
                  margin: "0 0 20px",
                  fontWeight: 500,
                }}
              >
                {unansweredCount} question{unansweredCount > 1 ? "s" : ""}{" "}
                unanswered
              </p>
            )}
            {unansweredCount === 0 && (
              <p
                style={{
                  fontSize: "13px",
                  color: OLIVE,
                  margin: "0 0 20px",
                  fontWeight: 500,
                }}
              >
                All questions answered
              </p>
            )}
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  border: `1px solid ${STONE_LIGHT}`,
                  background: "#fff",
                  color: BARK_DEEPEST,
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: FONT_BODY,
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  border: "none",
                  background: GARNET,
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT_BODY,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Submitting overlay ──────────────────────────────────── */}
      {submitting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            background: "rgba(255,255,255,0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: `3px solid ${STONE_LIGHT}`,
              borderTopColor: GARNET,
              borderRadius: "50%",
              animation: "callaTestSpin 0.8s linear infinite",
            }}
          />
          <p
            style={{
              fontSize: "14px",
              color: BARK_DEEPEST,
              fontWeight: 500,
              fontFamily: FONT_DISPLAY,
            }}
          >
            Grading your test...
          </p>
          <style>{`
            @keyframes callaTestSpin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
