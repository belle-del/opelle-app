"use client";

import { useState, type CSSProperties } from "react";

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

interface QuizQuestion {
  id: string;
  domain: string;
  topic: string;
  questionText: string;
  options: string[];
  difficulty: number;
}

interface QuizResult {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  xpEarned?: number;
}

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  result?: QuizResult;
  disabled?: boolean;
}

/* ─── Option labels ─────────────────────────────────────────────── */

const OPTION_LABELS = ["A", "B", "C", "D"];

/* ─── Difficulty dots ───────────────────────────────────────────── */

function DifficultyDots({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: i <= level ? GARNET : `${STONE_LIGHT}`,
            border: i <= level ? "none" : `1px solid ${TEXT_FAINT}`,
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function QuizCard({
  question,
  onAnswer,
  result,
  disabled = false,
}: QuizCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const answered = result !== undefined;

  const handleSelect = (index: number) => {
    if (answered || disabled) return;
    setSelectedIndex(index);
    onAnswer(question.id, question.options[index]);
  };

  const getOptionStyle = (index: number): CSSProperties => {
    const option = question.options[index];
    const isSelected = selectedIndex === index;
    const isHovered = hoveredIndex === index;

    // After result
    if (answered && result) {
      const isCorrectOption = option === result.correctAnswer;
      const isWrongSelected = isSelected && !result.correct;

      if (isCorrectOption) {
        return {
          background: `${OLIVE}18`,
          border: `2px solid ${OLIVE}`,
          color: BARK_DEEPEST,
        };
      }
      if (isWrongSelected) {
        return {
          background: `${GARNET}12`,
          border: `2px solid ${GARNET}`,
          color: GARNET,
          textDecoration: "line-through",
        };
      }
      return {
        background: "#fff",
        border: `1px solid ${STONE_LIGHT}`,
        color: TEXT_FAINT,
      };
    }

    // Selected before result
    if (isSelected) {
      return {
        background: GARNET,
        border: `2px solid ${GARNET}`,
        color: "#fff",
      };
    }

    // Hover
    if (isHovered && !disabled) {
      return {
        background: GARNET_BLUSH,
        border: `1px solid ${GARNET}40`,
        color: BARK_DEEPEST,
      };
    }

    // Default
    return {
      background: "#fff",
      border: `1px solid ${STONE_LIGHT}`,
      color: BARK_DEEPEST,
    };
  };

  return (
    <div
      style={{
        background: STONE_LIGHT,
        border: `1px solid ${STONE_LIGHT}`,
        borderRadius: "14px",
        padding: "20px",
        maxWidth: "520px",
        width: "100%",
        fontFamily: FONT_BODY,
      }}
    >
      {/* Domain / Topic badge + Difficulty */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: TEXT_FAINT,
            background: "#fff",
            padding: "3px 8px",
            borderRadius: "6px",
          }}
        >
          {question.domain} &middot; {question.topic}
        </span>
        <DifficultyDots level={question.difficulty} />
      </div>

      {/* Question text */}
      <p
        style={{
          fontSize: "15px",
          fontWeight: 600,
          lineHeight: 1.5,
          color: BARK_DEEPEST,
          margin: "0 0 18px",
          fontFamily: FONT_DISPLAY,
        }}
      >
        {question.questionText}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {question.options.map((option, index) => {
          const optionDynamic = getOptionStyle(index);
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={answered || disabled}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                cursor: answered || disabled ? "default" : "pointer",
                fontSize: "13px",
                fontFamily: FONT_BODY,
                fontWeight: 500,
                textAlign: "left",
                transition: "all 0.15s ease",
                ...optionDynamic,
              }}
            >
              <span
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  flexShrink: 0,
                  background:
                    selectedIndex === index && !answered
                      ? "rgba(255,255,255,0.25)"
                      : `${STONE_LIGHT}80`,
                  color: "inherit",
                }}
              >
                {OPTION_LABELS[index]}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
            </button>
          );
        })}
      </div>

      {/* Result explanation */}
      {answered && result && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "10px",
            background: result.correct ? `${OLIVE}10` : `${GARNET}08`,
            borderLeft: `3px solid ${result.correct ? OLIVE : GARNET}`,
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: result.correct ? OLIVE : GARNET,
              margin: "0 0 6px",
            }}
          >
            {result.correct ? "Correct!" : "Not quite"}
          </p>
          <p
            style={{
              fontSize: "12px",
              lineHeight: 1.6,
              color: BARK_DEEPEST,
              margin: 0,
            }}
          >
            {result.explanation}
          </p>

          {/* XP badge */}
          {result.xpEarned != null && result.xpEarned > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "10px",
                background: BRASS,
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "20px",
              }}
            >
              +{result.xpEarned} XP
            </div>
          )}
        </div>
      )}
    </div>
  );
}
