"use client";

import { useState, useEffect } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_BLUSH = "#F5E1E5";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const OLIVE = "#6B7F4E";
const BRASS = "#C4AB70";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Types ─────────────────────────────────────────────────────── */

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

interface TestResultsProps {
  results: TestSubmitResult;
  onClose: () => void;
  onReview?: () => void;
}

/* ─── Domain bar component ──────────────────────────────────────── */

function DomainBar({
  domain,
  accuracy,
  attempted,
  correct,
}: {
  domain: string;
  accuracy: number;
  attempted: number;
  correct: number;
}) {
  const passing = accuracy >= 75;
  const barColor = passing ? OLIVE : GARNET_BLUSH;
  const textColor = passing ? OLIVE : GARNET;
  const pct = Math.round(accuracy);

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: BARK_DEEPEST,
          }}
        >
          {domain}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: textColor,
          }}
        >
          {pct}%{" "}
          <span style={{ fontWeight: 400, color: TEXT_FAINT, fontSize: "10px" }}>
            ({correct}/{attempted})
          </span>
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          borderRadius: "4px",
          background: `${STONE_LIGHT}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            borderRadius: "4px",
            background: barColor,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Achievement badge ─────────────────────────────────────────── */

function AchievementBadge({ name }: { name: string }) {
  // Convert key like "first_test_passed" to "First Test Passed"
  const displayName = name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: `${BRASS}20`,
        border: `1px solid ${BRASS}60`,
        borderRadius: "20px",
        padding: "4px 12px",
        fontSize: "11px",
        fontWeight: 600,
        color: BARK_DEEPEST,
        fontFamily: FONT_BODY,
      }}
    >
      {displayName}
    </span>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function TestResults({
  results,
  onClose,
  onReview,
}: TestResultsProps) {
  const { score, passed, xp, newAchievements } = results;
  const overall = Math.round(score.overall);
  const domains = Object.entries(score.byDomain);

  /* Level up animation */
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (xp.leveledUp) {
      const timer = setTimeout(() => setShowLevelUp(true), 400);
      return () => clearTimeout(timer);
    }
  }, [xp.leveledUp]);

  return (
    <div
      style={{
        maxWidth: "520px",
        width: "100%",
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: FONT_BODY,
      }}
    >
      {/* ─── Score display ───────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        <p
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: passed ? OLIVE : GARNET,
            margin: "0",
            lineHeight: 1.1,
            fontFamily: FONT_DISPLAY,
          }}
        >
          {overall}%
        </p>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            color: passed ? OLIVE : GARNET,
            margin: "8px 0 0",
          }}
        >
          {passed ? "PASSED" : "NEEDS WORK"}
        </p>
      </div>

      {/* ─── XP earned ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: BRASS,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            padding: "6px 16px",
            borderRadius: "20px",
          }}
        >
          +{xp.xpEarned} XP
        </span>
      </div>

      {/* ─── Level up celebration ────────────────────────────────── */}
      {xp.leveledUp && showLevelUp && (
        <div
          style={{
            textAlign: "center",
            padding: "16px",
            marginBottom: "24px",
            background: `${BRASS}12`,
            border: `1px solid ${BRASS}40`,
            borderRadius: "12px",
            animation: "callaLevelPop 0.4s ease-out",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: BARK_DEEPEST,
              margin: 0,
              fontFamily: FONT_DISPLAY,
            }}
          >
            Level Up!
          </p>
          <p
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: BRASS,
              margin: "4px 0 0",
              fontFamily: FONT_DISPLAY,
            }}
          >
            Level {xp.newLevel}
          </p>
          <style>{`
            @keyframes callaLevelPop {
              0% { transform: scale(0.8); opacity: 0; }
              60% { transform: scale(1.05); }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ─── Domain breakdown ────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${STONE_LIGHT}`,
          borderRadius: "14px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: BARK_DEEPEST,
            margin: "0 0 16px",
          }}
        >
          Domain Breakdown
        </p>
        {domains.map(([domain, stats]) => (
          <DomainBar
            key={domain}
            domain={domain}
            accuracy={stats.accuracy}
            attempted={stats.attempted}
            correct={stats.correct}
          />
        ))}
      </div>

      {/* ─── Achievements ────────────────────────────────────────── */}
      {newAchievements.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: BARK_DEEPEST,
              margin: "0 0 10px",
            }}
          >
            New Achievements
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {newAchievements.map((ach) => (
              <AchievementBadge key={ach.achievementKey} name={ach.achievementKey} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px" }}>
        {onReview && (
          <button
            onClick={onReview}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "10px",
              border: `1px solid ${STONE_LIGHT}`,
              background: "#fff",
              color: BARK_DEEPEST,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT_BODY,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = GARNET;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = STONE_LIGHT;
            }}
          >
            Review Answers
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: "10px",
            border: "none",
            background: GARNET,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT_BODY,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Back to Chat
        </button>
      </div>
    </div>
  );
}
