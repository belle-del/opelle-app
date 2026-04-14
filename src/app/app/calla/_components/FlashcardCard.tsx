"use client";

import { useState, type CSSProperties } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_BLUSH = "#F5E1E5";
const STONE_LIGHT = "#E5E3D3";
const BARK_DEEPEST = "#2C2C24";
const OLIVE = "#6B7F4E";
const TEXT_FAINT = "#8A8A7A";

const FONT_BODY = "'DM Sans', sans-serif";
const FONT_DISPLAY = "'Fraunces', serif";

/* ─── Types ─────────────────────────────────────────────────────── */

interface FlashcardData {
  id: string;
  domain: string;
  topic: string;
  frontText: string;
  backText: string;
}

interface FlashcardCardProps {
  card: FlashcardData;
  onResult: (cardId: string, knew: boolean) => void;
  currentIndex?: number;
  totalCards?: number;
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function FlashcardCard({
  card,
  onResult,
  currentIndex,
  totalCards,
}: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleFlip = () => {
    if (!flipped) setFlipped(true);
  };

  const handleResult = (knew: boolean) => {
    setAnswered(true);
    onResult(card.id, knew);
  };

  /* ─── Shared face styles ──────────────────────────────────────── */

  const faceBase: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    padding: "24px 20px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        maxWidth: "440px",
        width: "100%",
        fontFamily: FONT_BODY,
      }}
    >
      {/* Progress counter */}
      {currentIndex != null && totalCards != null && (
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: TEXT_FAINT,
            marginBottom: "10px",
            fontWeight: 500,
          }}
        >
          {currentIndex + 1} / {totalCards}
        </div>
      )}

      {/* Card container with perspective */}
      <div
        onClick={handleFlip}
        style={{
          perspective: "1000px",
          cursor: flipped ? "default" : "pointer",
          minHeight: "260px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "260px",
            transition: "transform 0.5s ease",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ─── Front face ───────────────────────────────────────── */}
          <div
            style={{
              ...faceBase,
              background: STONE_LIGHT,
              border: `1px solid ${STONE_LIGHT}`,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Domain badge */}
            <span
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
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
              {card.domain}
            </span>

            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                lineHeight: 1.6,
                color: BARK_DEEPEST,
                textAlign: "center",
                margin: "16px 0",
                fontFamily: FONT_DISPLAY,
              }}
            >
              {card.frontText}
            </p>

            <span
              style={{
                position: "absolute",
                bottom: "16px",
                fontSize: "11px",
                color: TEXT_FAINT,
                fontStyle: "italic",
              }}
            >
              Tap to flip
            </span>
          </div>

          {/* ─── Back face ────────────────────────────────────────── */}
          <div
            style={{
              ...faceBase,
              background: "#fff",
              borderLeft: `4px solid ${GARNET}`,
              border: `1px solid ${STONE_LIGHT}`,
              borderLeftWidth: "4px",
              borderLeftColor: GARNET,
              transform: "rotateY(180deg)",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {/* Domain badge */}
            <span
              style={{
                position: "absolute",
                top: "16px",
                left: "20px",
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
              {card.domain} &middot; {card.topic}
            </span>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.7,
                color: BARK_DEEPEST,
                margin: "16px 0",
                fontFamily: FONT_BODY,
              }}
            >
              {card.backText}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Knew it / Didn't know buttons ──────────────────────── */}
      {flipped && !answered && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          <button
            onClick={() => handleResult(false)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: GARNET_BLUSH,
              color: GARNET,
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: FONT_BODY,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Didn&apos;t know
          </button>
          <button
            onClick={() => handleResult(true)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: OLIVE,
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: FONT_BODY,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Knew it
          </button>
        </div>
      )}
    </div>
  );
}
