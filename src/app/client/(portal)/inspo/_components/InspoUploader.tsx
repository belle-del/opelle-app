"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSubmitted: () => void;
};

export function InspoUploader({ onSubmitted }: Props) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - photos.length);
    const validFiles = newFiles.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(f.type)
    );

    if (validFiles.length === 0) return;

    setPhotos((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (photos.length === 0) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    photos.forEach((photo, i) => {
      formData.append(`photo${i}`, photo);
    });
    if (notes.trim()) {
      formData.append("clientNotes", notes.trim());
    }

    try {
      setAnalyzing(true);
      const res = await fetch("/api/client/inspo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      onSubmitted();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }

  if (analyzing) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--brass-soft)" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brass)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              style={{ animationDuration: "2s" }}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <h3
            className="text-lg mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--stone-lightest)",
            }}
          >
            Analyzing your inspo...
          </h3>
          <p style={{ fontSize: "13px", color: "var(--stone-shadow)" }}>
            Our AI is reviewing your photos and preparing personalized
            questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Photo grid */}
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-on-stone)",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              Upload inspiration photos
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-on-stone-ghost)",
                marginBottom: "12px",
              }}
            >
              Up to 5 photos from your camera roll
            </p>

            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    aspectRatio: "1",
                    border: "1px solid var(--stone-mid)",
                  }}
                >
                  <img
                    src={src}
                    alt={`Inspo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      fontSize: "14px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}

              {photos.length < 5 && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg flex flex-col items-center justify-center transition-all"
                  style={{
                    aspectRatio: "1",
                    border: "2px dashed var(--stone-mid)",
                    background: "rgba(0,0,0,0.02)",
                    cursor: "pointer",
                    color: "var(--text-on-stone-faint)",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <span style={{ fontSize: "10px", marginTop: "4px" }}>
                    Add
                  </span>
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Notes */}
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-on-stone)",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              Anything you want your stylist to know about this look?
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional \u2014 tell us what caught your eye"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p style={{ fontSize: "12px", color: "var(--garnet)", textAlign: "center" }}>
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={photos.length === 0 || uploading}
        className="w-full"
        size="lg"
      >
        {uploading ? "Uploading..." : `Submit ${photos.length} Photo${photos.length !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
