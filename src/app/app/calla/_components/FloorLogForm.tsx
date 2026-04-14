"use client";
import { useState, useRef, useCallback, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";

/* ─── Design tokens ──────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_HOVER = "#5A1F2E";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_FAINT = "#8A8A7A";
const OLIVE = "#6B7B3A";

/* ─── Service types ──────────────────────────────────────────────── */

const SERVICE_TYPES = [
  "Haircut", "Color", "Highlights", "Balayage", "Perm", "Relaxer",
  "Facial", "Manicure", "Pedicure", "Updo", "Blowout", "Other",
];

/* ─── Props ──────────────────────────────────────────────────────── */

interface FloorLogFormProps {
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

export default function FloorLogForm({ onSuccess }: FloorLogFormProps) {
  const [serviceType, setServiceType] = useState("");
  const [clientIdentifier, setClientIdentifier] = useState("");
  const [productsUsed, setProductsUsed] = useState<string[]>([]);
  const [productInput, setProductInput] = useState("");
  const [formulaNotes, setFormulaNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Product tag helpers */
  const addProduct = () => {
    const trimmed = productInput.trim();
    if (trimmed && !productsUsed.includes(trimmed)) {
      setProductsUsed((prev) => [...prev, trimmed]);
      setProductInput("");
    }
  };

  const removeProduct = (idx: number) => {
    setProductsUsed((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProductKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addProduct();
    }
    if (e.key === "Backspace" && !productInput && productsUsed.length > 0) {
      removeProduct(productsUsed.length - 1);
    }
  };

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
    if (!serviceType.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/calla/log/floor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          clientIdentifier: clientIdentifier.trim() || null,
          productsUsed,
          formulaNotes: formulaNotes.trim() || null,
          photoUrls: [],
          outcomeNotes: outcomeNotes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const earned = data.xp?.xpAwarded || 50;
      setXpEarned(earned);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Reset form
      setServiceType("");
      setClientIdentifier("");
      setProductsUsed([]);
      setProductInput("");
      setFormulaNotes("");
      setFiles([]);
      setOutcomeNotes("");

      onSuccess?.();
    } catch {
      // Could show error toast
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Shared styles ────────────────────────────────────────────── */

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
      {/* Service type dropdown */}
      <div>
        <label style={labelStyle}>Service Type</label>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          style={{
            ...inputStyle,
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A8A7A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "36px",
            cursor: "pointer",
          }}
        >
          <option value="">Select a service...</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Client identifier */}
      <div>
        <label style={labelStyle}>Client Identifier</label>
        <input
          type="text"
          value={clientIdentifier}
          onChange={(e) => setClientIdentifier(e.target.value)}
          placeholder="Client initials (e.g., JD)"
          maxLength={10}
          style={inputStyle}
        />
      </div>

      {/* Products used — tag input */}
      <div>
        <label style={labelStyle}>Products Used</label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            padding: "8px 10px",
            border: `1px solid ${STONE}`,
            borderRadius: "8px",
            background: "#fff",
            minHeight: "40px",
            alignItems: "center",
            cursor: "text",
          }}
          onClick={() => {
            const input = document.getElementById("product-input");
            input?.focus();
          }}
        >
          {productsUsed.map((product, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: CREAM,
                border: `1px solid ${STONE}`,
                borderRadius: "14px",
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif",
                color: TEXT_PRIMARY,
                fontWeight: 500,
              }}
            >
              {product}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeProduct(idx);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={10} style={{ color: TEXT_FAINT }} />
              </button>
            </span>
          ))}
          <input
            id="product-input"
            type="text"
            value={productInput}
            onChange={(e) => setProductInput(e.target.value)}
            onKeyDown={handleProductKeyDown}
            onBlur={addProduct}
            placeholder={productsUsed.length === 0 ? "Type and press Enter to add..." : ""}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "12px",
              fontFamily: "'DM Sans', sans-serif",
              color: TEXT_PRIMARY,
              flex: 1,
              minWidth: "80px",
              padding: "2px 0",
            }}
          />
        </div>
      </div>

      {/* Formula notes */}
      <div>
        <label style={labelStyle}>Formula Notes</label>
        <textarea
          value={formulaNotes}
          onChange={(e) => setFormulaNotes(e.target.value)}
          placeholder="Color formula, mixing ratios, timing..."
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "72px",
          }}
        />
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

      {/* Outcome notes */}
      <div>
        <label style={labelStyle}>Outcome Notes</label>
        <textarea
          value={outcomeNotes}
          onChange={(e) => setOutcomeNotes(e.target.value)}
          placeholder="How did it turn out? What would you do differently?"
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
        disabled={!serviceType.trim() || submitting}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          background: !serviceType.trim() || submitting ? STONE : GARNET,
          color: !serviceType.trim() || submitting ? TEXT_FAINT : "#fff",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: !serviceType.trim() || submitting ? "default" : "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (serviceType.trim() && !submitting) {
            e.currentTarget.style.background = GARNET_HOVER;
          }
        }}
        onMouseLeave={(e) => {
          if (serviceType.trim() && !submitting) {
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
