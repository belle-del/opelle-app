"use client";

import { useEffect } from "react";
import type { PhotoPair } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = {
  pair: PhotoPair;
  onClose: () => void;
};

export function BeforeAfterModal({ pair, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--stone-dark, #2C2C24)",
          borderRadius: "16px",
          border: "1px solid rgba(196,171,112,0.15)",
          maxWidth: "800px",
          width: "100%",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(196,171,112,0.1)",
        }}>
          <div>
            <span style={{
              fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--brass, #C4AB70)",
            }}>
              {pair.categoryName}
            </span>
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.4)", marginTop: "2px" }}>
              {formatDate(pair.completedAt)}
              {pair.studentName && ` · ${pair.studentName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(241,239,224,0.06)", border: "none", color: "rgba(241,239,224,0.5)",
              borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer",
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Photos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
          {["before", "after"].map((side) => {
            const url = side === "before" ? pair.beforePhotoUrl : pair.afterPhotoUrl;
            return (
              <div key={side}>
                <p style={{
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "rgba(196,171,112,0.7)", padding: "8px 12px 4px",
                }}>
                  {side}
                </p>
                <div style={{ aspectRatio: "3/4", background: "#1A1A14" }}>
                  {url ? (
                    <img
                      src={url}
                      alt={`${side} photo`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(196,171,112,0.3)", fontSize: "13px",
                    }}>
                      No {side} photo
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {pair.notes && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(196,171,112,0.1)" }}>
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", fontStyle: "italic" }}>
              {pair.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
