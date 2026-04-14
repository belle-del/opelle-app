"use client";
import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Star, Upload, Image as ImageIcon, X } from "lucide-react";

/* ─── Design tokens ──────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_HOVER = "#5A1F2E";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";
const BRASS = "#B08D57";
const OLIVE = "#6B7B3A";

/* ─── Technique suggestions ─────────────────────────────────────── */

const TECHNIQUES = [
  "Braiding", "Dutch Braid", "French Braid", "Cornrows", "Sectioning",
  "Hair Cutting", "Layering", "Blunt Cut", "Hair Coloring", "Highlights",
  "Balayage", "Color Application", "Blowout", "Curling", "Updo",
  "Chemical Texture", "Perm", "Relaxer", "Facial", "Manicure", "Pedicure",
];

/* ─── Props ──────────────────────────────────────────────────────── */

interface ClassroomLogFormProps {
  onSuccess?: () => void;
}

/* ─── XP Toast ───────────────────────────────────────────────────── */

function XpToast({ xp, visible }: { xp: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "32px",
        right: "32px",
        background: OLIVE,
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "10px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 9999,
        animation: "callaSlideUp 0.3s ease",
      }}
    >
      +{xp} XP earned!
      <style>{`
        @keyframes callaSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main form ──────────────────────────────────────────────────── */

export default function ClassroomLogForm({ onSuccess }: ClassroomLogFormProps) {
  const [techniqueName, setTechniqueName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [duration, setDuration] = useState(30);
  const [isMannequin, setIsMannequin] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [selfAssessment, setSelfAssessment] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTechniques = techniqueName.trim()
    ? TECHNIQUES.filter((t) =>
        t.toLowerCase().includes(techniqueName.toLowerCase())
      )
    : TECHNIQUES;

  /* File handling */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* Submit */
  const handleSubmit = async () => {
    if (!techniqueName.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/calla/log/classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          techniqueName: techniqueName.trim(),
          durationMinutes: duration,
          isMannequin,
          photoUrls: [],
          selfAssessment: selfAssessment || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const earned = data.xp?.xpAwarded || 30;
      setXpEarned(earned);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Reset form
      setTechniqueName("");
      setDuration(30);
      setIsMannequin(true);
      setFiles([]);
      setSelfAssessment(0);
      setNotes("");

      onSuccess?.();
    } catch {
      // Could show error toast
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Shared input styles ──────────────────────────────────────── */

  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 600,
    color: TEXT_PRIMARY,
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${STONE}`,
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
    color: TEXT_PRIMARY,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Technique name with autocomplete */}
      <div style={{ position: "relative" }}>
        <label style={labelStyle}>Technique Name</label>
        <input
          type="text"
          value={techniqueName}
          onChange={(e) => {
            setTechniqueName(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="e.g. French Braid"
          style={inputStyle}
        />
        {showSuggestions && filteredTechniques.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: `1px solid ${STONE}`,
              borderRadius: "8px",
              marginTop: "4px",
              maxHeight: "180px",
              overflowY: "auto",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            {filteredTechniques.map((t) => (
              <button
                key={t}
                onMouseDown={() => {
                  setTechniqueName(t);
                  setShowSuggestions(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: TEXT_PRIMARY,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = CREAM;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Duration */}
      <div>
        <label style={labelStyle}>Duration (minutes)</label>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(0, Math.min(180, Number(e.target.value))))}
            min={0}
            max={180}
            style={{ ...inputStyle, width: "80px", textAlign: "center" }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: TEXT_FAINT,
            }}
          >
            min
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={180}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={{
            width: "100%",
            marginTop: "8px",
            accentColor: GARNET,
          }}
        />
      </div>

      {/* Mannequin / Live toggle */}
      <div>
        <label style={labelStyle}>Practice Type</label>
        <div style={{ display: "flex", gap: "0", borderRadius: "8px", overflow: "hidden", border: `1px solid ${STONE}` }}>
          {[
            { value: true, label: "Mannequin" },
            { value: false, label: "Live" },
          ].map(({ value, label }) => {
            const active = isMannequin === value;
            return (
              <button
                key={label}
                onClick={() => setIsMannequin(value)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : TEXT_PRIMARY,
                  background: active ? GARNET : "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <label style={labelStyle}>Photos</label>
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
            borderRadius: "10px",
            padding: "24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? `${GARNET}08` : CREAM,
            transition: "all 0.15s ease",
          }}
        >
          <Upload size={20} style={{ color: TEXT_FAINT, marginBottom: "8px" }} />
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: TEXT_FAINT,
              margin: 0,
            }}
          >
            Drag & drop photos or click to select
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* Thumbnails */}
        {files.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {files.map((file, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  width: "64px",
                  height: "64px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: `1px solid ${STONE}`,
                  background: CREAM,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ImageIcon size={20} style={{ color: TEXT_FAINT }} />
                <span
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: "2px",
                    right: "2px",
                    fontSize: "8px",
                    fontFamily: "'DM Sans', sans-serif",
                    color: TEXT_FAINT,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <X size={10} style={{ color: "#fff" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Self-assessment stars */}
      <div>
        <label style={labelStyle}>Self-Assessment</label>
        <div style={{ display: "flex", gap: "4px" }}>
          {[1, 2, 3, 4, 5].map((s) => {
            const filled = s <= (hoverStar || selfAssessment);
            return (
              <button
                key={s}
                onClick={() => setSelfAssessment(s === selfAssessment ? 0 : s)}
                onMouseEnter={() => setHoverStar(s)}
                onMouseLeave={() => setHoverStar(0)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  transition: "transform 0.1s",
                  transform: filled ? "scale(1.1)" : "scale(1)",
                }}
              >
                <Star
                  size={24}
                  fill={filled ? BRASS : "none"}
                  stroke={filled ? BRASS : STONE}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you practice? How did it go?"
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "72px",
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!techniqueName.trim() || submitting}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          background: !techniqueName.trim() || submitting ? STONE : GARNET,
          color: !techniqueName.trim() || submitting ? TEXT_FAINT : "#fff",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: !techniqueName.trim() || submitting ? "default" : "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (techniqueName.trim() && !submitting) {
            e.currentTarget.style.background = GARNET_HOVER;
          }
        }}
        onMouseLeave={(e) => {
          if (techniqueName.trim() && !submitting) {
            e.currentTarget.style.background = GARNET;
          }
        }}
      >
        {submitting ? "Saving..." : "Save Log"}
      </button>

      <XpToast xp={xpEarned} visible={showToast} />
    </div>
  );
}
