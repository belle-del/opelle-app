"use client";

import type { PhotoPair } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = {
  pair: PhotoPair;
  onClick: () => void;
};

export function PhotoPairCard({ pair, onClick }: Props) {
  const primaryUrl = pair.afterPhotoUrl || pair.beforePhotoUrl;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--stone-dark, #2C2C24)",
        border: "1px solid rgba(196,171,112,0.1)",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Primary (after) photo */}
      <div style={{ aspectRatio: "4/3", position: "relative", background: "#1A1A14" }}>
        {primaryUrl ? (
          <img
            src={primaryUrl}
            alt={pair.afterPhotoUrl ? "After photo" : "Before photo"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(196,171,112,0.3)", fontSize: "12px",
          }}>
            No photo
          </div>
        )}

        {/* Before overlay — bottom-left, 25% width */}
        {pair.beforePhotoUrl && pair.afterPhotoUrl && (
          <div style={{
            position: "absolute", bottom: "8px", left: "8px",
            width: "25%", aspectRatio: "4/3",
            borderRadius: "6px", overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            <img
              src={pair.beforePhotoUrl}
              alt="Before photo"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--brass, #C4AB70)",
            padding: "2px 8px", borderRadius: "100px",
            border: "1px solid rgba(196,171,112,0.2)",
          }}>
            {pair.categoryName}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(241,239,224,0.4)" }}>
            {formatDate(pair.completedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
