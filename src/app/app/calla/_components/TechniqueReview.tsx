"use client";
import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import {
  Camera, Check, ArrowRight, Lightbulb, X, Sparkles,
} from "lucide-react";

/* ─── Design tokens ──────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_HOVER = "#5A1F2E";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";
const BRASS = "#B08D57";
const OLIVE = "#6B7B3A";

/* ─── Technique categories ───────────────────────────────────────── */

const CATEGORIES = [
  { key: "braiding", label: "Braiding", icon: "1" },
  { key: "sectioning", label: "Sectioning", icon: "2" },
  { key: "color_application", label: "Color Application", icon: "3" },
  { key: "blending", label: "Blending", icon: "4" },
  { key: "cutting", label: "Cutting", icon: "5" },
  { key: "styling", label: "Styling", icon: "6" },
];

/* ─── Props ──────────────────────────────────────────────────────── */

interface TechniqueReviewProps {
  onClose?: () => void;
}

/* ─── Score gauge ────────────────────────────────────────────────── */

function ScoreGauge({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 7 ? OLIVE : score >= 4 ? BRASS : GARNET;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <svg width="108" height="108" viewBox="0 0 108 108">
        {/* Background circle */}
        <circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke={STONE}
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {/* Score text */}
        <text
          x="54"
          y="50"
          textAnchor="middle"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "28px",
            fontWeight: 600,
            fill: color,
          }}
        >
          {score}
        </text>
        <text
          x="54"
          y="68"
          textAnchor="middle"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            fill: TEXT_FAINT,
          }}
        >
          out of 10
        </text>
      </svg>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function TechniqueReview({ onClose }: TechniqueReviewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    analysis: { whatsWorking: string; whatToAdjust: string; tryThisNext: string };
    feedbackText: string;
    improvementDelta?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* File handling */
  const processFile = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    },
    [processFile]
  );

  /* Submit for analysis */
  const handleSubmit = async () => {
    if (!file || !category || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/calla/technique/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: "pending-upload",
          techniqueCategory: category,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const review = data.review || {};

      setResult({
        score: review.score ?? 5,
        analysis: review.analysis ?? {
          whatsWorking: review.feedbackText || "Good effort on this technique.",
          whatToAdjust: "Continue practicing for consistency.",
          tryThisNext: "Try varying your approach to build versatility.",
        },
        feedbackText: review.feedbackText || "",
        improvementDelta: review.improvementDelta,
      });
    } catch {
      // Could show error
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Results view ─────────────────────────────────────────────── */

  if (result) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "24px",
          background: "#FAFAF5",
          borderRadius: "12px",
          border: `1px solid ${STONE}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "18px",
              fontWeight: 500,
              color: TEXT_PRIMARY,
              margin: 0,
            }}
          >
            Technique Feedback
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: TEXT_FAINT,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Score gauge */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ScoreGauge score={result.score} />
        </div>

        {/* Improvement banner */}
        {result.improvementDelta != null && result.improvementDelta > 0 && (
          <div
            style={{
              background: `${OLIVE}14`,
              border: `1px solid ${OLIVE}40`,
              borderRadius: "10px",
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: OLIVE,
              }}
            >
              <Sparkles
                size={14}
                style={{ verticalAlign: "middle", marginRight: "4px" }}
              />
              +{result.improvementDelta} points improvement!
            </span>
          </div>
        )}

        {/* Feedback sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* What's working */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px",
              background: `${OLIVE}0A`,
              borderRadius: "10px",
              border: `1px solid ${OLIVE}20`,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: `${OLIVE}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check size={14} style={{ color: OLIVE }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: OLIVE,
                  margin: "0 0 4px",
                }}
              >
                What&apos;s working
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: TEXT_PRIMARY,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {result.analysis.whatsWorking}
              </p>
            </div>
          </div>

          {/* What to adjust */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px",
              background: `${BRASS}0A`,
              borderRadius: "10px",
              border: `1px solid ${BRASS}20`,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: `${BRASS}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArrowRight size={14} style={{ color: BRASS }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: BRASS,
                  margin: "0 0 4px",
                }}
              >
                What to adjust
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: TEXT_PRIMARY,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {result.analysis.whatToAdjust}
              </p>
            </div>
          </div>

          {/* Try this next */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px",
              background: `${GARNET}08`,
              borderRadius: "10px",
              border: `1px solid ${GARNET}18`,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: `${GARNET}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lightbulb size={14} style={{ color: GARNET }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: GARNET,
                  margin: "0 0 4px",
                }}
              >
                Try this next
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: TEXT_PRIMARY,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {result.analysis.tryThisNext}
              </p>
            </div>
          </div>
        </div>

        {/* Save & Close */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: GARNET,
            color: "#fff",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = GARNET_HOVER;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = GARNET;
          }}
        >
          Save & Close
        </button>
      </div>
    );
  }

  /* ─── Upload + select view ─────────────────────────────────────── */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
        background: "#FAFAF5",
        borderRadius: "12px",
        border: `1px solid ${STONE}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "18px",
            fontWeight: 500,
            color: TEXT_PRIMARY,
            margin: 0,
          }}
        >
          Get Feedback on Your Technique
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: TEXT_FAINT,
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Photo upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? GARNET : STONE}`,
          borderRadius: "12px",
          padding: preview ? "0" : "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? `${GARNET}08` : CREAM,
          transition: "all 0.15s ease",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview ? (
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt="Selected technique"
              style={{
                width: "100%",
                maxHeight: "280px",
                objectFit: "cover",
                display: "block",
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
              }}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} style={{ color: "#fff" }} />
            </button>
          </div>
        ) : (
          <>
            <Camera
              size={32}
              style={{ color: TEXT_FAINT, marginBottom: "12px" }}
            />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: TEXT_PRIMARY,
                margin: "0 0 4px",
              }}
            >
              Upload your technique photo
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: TEXT_FAINT,
                margin: 0,
              }}
            >
              Drag & drop or click to select
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {/* Category selector — 2x3 grid */}
      <div>
        <label
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: TEXT_PRIMARY,
            marginBottom: "10px",
            display: "block",
          }}
        >
          Technique Category
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {CATEGORIES.map(({ key, label }) => {
            const active = category === key;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                style={{
                  padding: "14px 12px",
                  borderRadius: "10px",
                  border: active
                    ? `2px solid ${GARNET}`
                    : `1px solid ${STONE}`,
                  background: active ? `${GARNET}0C` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = GARNET;
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${GARNET}20`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = STONE;
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    color: active ? GARNET : TEXT_PRIMARY,
                    margin: 0,
                  }}
                >
                  {label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || !category || submitting}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "10px",
          border: "none",
          background: !file || !category || submitting ? STONE : GARNET,
          color: !file || !category || submitting ? TEXT_FAINT : "#fff",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: !file || !category || submitting ? "default" : "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (file && category && !submitting) {
            e.currentTarget.style.background = GARNET_HOVER;
          }
        }}
        onMouseLeave={(e) => {
          if (file && category && !submitting) {
            e.currentTarget.style.background = GARNET;
          }
        }}
      >
        {submitting ? "Calla is analyzing your work..." : "Ask Calla"}
      </button>

      {/* Loading animation */}
      {submitting && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: TEXT_FAINT,
                fontStyle: "italic",
              }}
            >
              Calla is analyzing your work
            </span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: GARNET,
                  display: "inline-block",
                  animation: `callaReviewPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes callaReviewPulse {
              0%, 60%, 100% { opacity: 0.25; transform: scale(0.8); }
              30% { opacity: 1; transform: scale(1.2); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
