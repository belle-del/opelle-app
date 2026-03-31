"use client";

import { useState, useRef } from "react";

// Compress image to max 1024px and JPEG quality 0.8
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX = 1024;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
        else { w = Math.round(w * (MAX / h)); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

type PhotoSlot = {
  file?: File;
  previewUrl?: string;
  uploadedUrl?: string;
  uploading: boolean;
};

type BeforeAfterCaptureProps = {
  clientId?: string;
  appointmentId?: string;
  required?: boolean;
  onPhotosChange: (photos: { beforePhotoUrl?: string; afterPhotoUrl?: string }) => void;
};

export default function BeforeAfterCapture({
  clientId,
  appointmentId,
  required = false,
  onPhotosChange,
}: BeforeAfterCaptureProps) {
  const [before, setBefore] = useState<PhotoSlot>({ uploading: false });
  const [after, setAfter] = useState<PhotoSlot>({ uploading: false });
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  async function handleCapture(
    type: "before" | "after",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const setter = type === "before" ? setBefore : setAfter;
    const compressed = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressed);

    setter({ file: compressed, previewUrl, uploading: true });

    try {
      const formData = new FormData();
      formData.append("photo", compressed);
      formData.append("photo_type", type);
      if (clientId) formData.append("client_id", clientId);
      if (appointmentId) formData.append("appointment_id", appointmentId);

      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setter((prev) => ({ ...prev, uploadedUrl: url, uploading: false }));

      // Notify parent with both URLs
      const updatedBefore = type === "before" ? url : before.uploadedUrl;
      const updatedAfter = type === "after" ? url : after.uploadedUrl;
      onPhotosChange({
        beforePhotoUrl: updatedBefore,
        afterPhotoUrl: updatedAfter,
      });
    } catch {
      setter((prev) => ({ ...prev, uploading: false }));
    }
  }

  function renderSlot(
    type: "before" | "after",
    slot: PhotoSlot,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) {
    const label = type === "before" ? "Before" : "After";
    const hasPhoto = !!slot.previewUrl;

    return (
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#8A8778",
          marginBottom: "8px",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {label} {required && <span style={{ color: "#9E5A5A" }}>*</span>}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleCapture(type, e)}
          style={{ display: "none" }}
        />
        {hasPhoto ? (
          <div
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              aspectRatio: "3/4",
              background: "#F0EDE6",
            }}
          >
            <img
              src={slot.previewUrl}
              alt={`${label} photo`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {slot.uploading && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(44, 44, 36, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              </div>
            )}
            {!slot.uploading && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  background: "rgba(44, 44, 36, 0.7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                }}
              >
                Retake
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: "100%",
              aspectRatio: "3/4",
              borderRadius: "12px",
              border: `2px dashed ${required ? "#C4AB70" : "#D4D0C8"}`,
              background: "#FAF8F3",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C4AB70" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span style={{
              fontSize: "13px",
              color: "#5C5A4F",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Take {label} Photo
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", gap: "12px" }}>
        {renderSlot("before", before, beforeRef)}
        {renderSlot("after", after, afterRef)}
      </div>
      {required && !before.uploadedUrl && !after.uploadedUrl && (
        <p style={{
          fontSize: "11px",
          color: "#9E5A5A",
          marginTop: "8px",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Before and after photos are required for this service type.
        </p>
      )}
    </div>
  );
}
