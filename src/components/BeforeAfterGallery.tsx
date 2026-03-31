"use client";

import { useState } from "react";
import type { PhotoPair } from "@/lib/types";
import { PhotoPairCard } from "./PhotoPairCard";
import { BeforeAfterModal } from "./BeforeAfterModal";

type Props = {
  pairs: PhotoPair[];
  emptyMessage?: string;
};

export function BeforeAfterGallery({
  pairs,
  emptyMessage = "No photos yet.",
}: Props) {
  const [selectedPair, setSelectedPair] = useState<PhotoPair | null>(null);

  if (pairs.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "48px 24px",
        color: "rgba(241,239,224,0.4)", fontSize: "14px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "16px",
      }}>
        {pairs.map((pair) => (
          <PhotoPairCard
            key={pair.id}
            pair={pair}
            onClick={() => setSelectedPair(pair)}
          />
        ))}
      </div>

      {selectedPair && (
        <BeforeAfterModal
          pair={selectedPair}
          onClose={() => setSelectedPair(null)}
        />
      )}
    </>
  );
}
