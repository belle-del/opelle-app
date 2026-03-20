"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InspoFollowUp } from "./InspoFollowUp";

// Compress image to max 1200px and JPEG quality 0.8 (~200-400KB per photo)
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
            const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            });
            resolve(compressed);
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
      resolve(file); // fallback to original
    };
    img.src = url;
  });
}

type Props = {
  onSubmitted: () => void;
};

type SubmissionResult = {
  id: string;
  photoUrls: string[];
  aiAnalysis?: {
    perPhotoQuestions?: Array<{
      photoIndex: number;
      questions: Array<{
        id: string;
        question: string;
        type: string;
        options?: string[];
      }>;
    }>;
    generatedFormQuestions?: Array<{
      id: string;
      question: string;
      type: string;
      options?: string[];
    }>;
  };
};

type SuccessInfo = {
  clientSummary: string | null;
  aiAnalysisFailed: boolean;
};

const CATEGORIES = [
  {
    id: "color_tone",
    label: "Color Tone",
    icon: "🎨",
    description: "The shade, warmth, and depth you're drawn to — think blonde vs. brunette, warm vs. cool, rich vs. subtle.",
  },
  {
    id: "placement",
    label: "Placement",
    icon: "✨",
    description: "Where the color lives — highlights near the face, balayage pattern, shadow root depth, money pieces, or all-over.",
  },
  {
    id: "cut_shape",
    label: "Cut & Shape",
    icon: "✂️",
    description: "Length, layers, movement, face framing, bangs — the structure and silhouette of the style.",
  },
  {
    id: "overall_vibe",
    label: "Overall Vibe",
    icon: "💫",
    description: "The whole look and feel — lifestyle, aesthetic, energy. When you see it and just think 'that's me.'",
  },
] as const;

type CategoryPhotos = {
  files: File[];
  previews: string[];
};

export function InspoUploader({ onSubmitted }: Props) {
  const [photosByCategory, setPhotosByCategory] = useState<Record<string, CategoryPhotos>>({});
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalPhotos = Object.values(photosByCategory).reduce(
    (sum, cat) => sum + cat.files.length,
    0
  );

  async function handleFiles(categoryId: string, files: FileList | null) {
    if (!files) return;
    const current = photosByCategory[categoryId]?.files.length || 0;
    const newFiles = Array.from(files).slice(0, 3 - current);
    const validFiles = newFiles.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(f.type) ||
      f.name.toLowerCase().endsWith(".heic")
    );
    if (validFiles.length === 0) return;

    setPhotosByCategory((prev) => {
      const existing = prev[categoryId] || { files: [], previews: [] };
      return {
        ...prev,
        [categoryId]: {
          files: [...existing.files, ...validFiles],
          previews: existing.previews,
        },
      };
    });

    // Generate previews — use object URLs for standard images, compress HEIC first
    for (const file of validFiles) {
      let previewUrl: string;

      if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        // HEIC can't be displayed directly — compress to JPEG first for preview
        try {
          const compressed = await compressImage(file);
          previewUrl = URL.createObjectURL(compressed);
        } catch {
          previewUrl = URL.createObjectURL(file);
        }
      } else {
        previewUrl = URL.createObjectURL(file);
      }

      setPhotosByCategory((prev) => {
        const existing = prev[categoryId] || { files: [], previews: [] };
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            previews: [...existing.previews, previewUrl],
          },
        };
      });
    }
  }

  function removePhoto(categoryId: string, index: number) {
    setPhotosByCategory((prev) => {
      const existing = prev[categoryId];
      if (!existing) return prev;
      return {
        ...prev,
        [categoryId]: {
          files: existing.files.filter((_, i) => i !== index),
          previews: existing.previews.filter((_, i) => i !== index),
        },
      };
    });
  }

  async function handleSubmit() {
    if (totalPhotos === 0) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    let photoIndex = 0;
    const categoryMeta: Array<{ category: string; photoIndices: number[] }> = [];

    for (const cat of CATEGORIES) {
      const catPhotos = photosByCategory[cat.id];
      if (!catPhotos || catPhotos.files.length === 0) continue;

      const indices: number[] = [];
      for (const file of catPhotos.files) {
        const compressed = await compressImage(file);
        formData.append(`photo${photoIndex}`, compressed);
        indices.push(photoIndex);
        photoIndex++;
      }
      categoryMeta.push({ category: cat.id, photoIndices: indices });
    }

    if (notes.trim()) {
      formData.append("clientNotes", notes.trim());
    }
    formData.append("categories", JSON.stringify(categoryMeta));

    try {
      setAnalyzing(true);
      const res = await fetch("/api/client/inspo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      const allPreviews = Object.values(photosByCategory).flatMap((c) => c.previews);

      const hasQuestions =
        data.aiAnalysis?.generatedFormQuestions?.length > 0;

      if (hasQuestions) {
        setSubmission({
          id: data.id,
          photoUrls: allPreviews,
          aiAnalysis: data.aiAnalysis,
        });
      } else if (data.aiAnalysisFailed) {
        // AI failed — show error with retry option
        setError(
          data.analysisError
            ? `Analysis failed: ${data.analysisError}. Your photos were saved — tap to retry.`
            : "Our AI couldn't analyze your photos right now. Your photos were saved — tap to retry."
        );
      } else {
        setSuccessInfo({
          clientSummary: data.clientSummary ?? null,
          aiAnalysisFailed: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }

  if (submission) {
    return (
      <InspoFollowUp
        submissionId={submission.id}
        photoUrls={submission.photoUrls}
        aiAnalysis={submission.aiAnalysis}
        onComplete={onSubmitted}
      />
    );
  }

  if (successInfo) {
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
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h3
            className="text-lg mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: "#2C2C2A" }}
          >
            {successInfo.aiAnalysisFailed
              ? "Photos submitted"
              : "Inspo received"}
          </h3>
          <p
            style={{ fontSize: "13px", color: "#7A7A72", maxWidth: "280px", margin: "0 auto" }}
          >
            {successInfo.aiAnalysisFailed
              ? "Your photos have been saved. Your stylist will review them shortly."
              : successInfo.clientSummary
                ? successInfo.clientSummary
                : "Your stylist will review your inspo and follow up with you."}
          </p>
          <Button
            onClick={onSubmitted}
            className="mt-6"
            variant="secondary"
            size="sm"
          >
            Done
          </Button>
        </CardContent>
      </Card>
    );
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
            style={{ fontFamily: "'Fraunces', serif", color: "#2C2C2A" }}
          >
            Analyzing your inspo...
          </h3>
          <p style={{ fontSize: "13px", color: "#7A7A72" }}>
            Metis is reviewing your photos and preparing personalized questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category sections */}
      {CATEGORIES.map((cat) => {
        const catPhotos = photosByCategory[cat.id];
        const count = catPhotos?.files.length || 0;
        const isHovered = hoveredCategory === cat.id;

        return (
          <Card key={cat.id}>
            <CardContent style={{ padding: "16px" }}>
              {/* Category header */}
              <div
                className="flex items-center gap-3 mb-2"
                onMouseEnter={() => setHoveredCategory(cat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                style={{ cursor: "default" }}
              >
                <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#2C2C24",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          fontWeight: 400,
                          color: "#7A7A72",
                        }}
                      >
                        {count} photo{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#9A9A8E",
                      lineHeight: "1.4",
                      maxHeight: isHovered ? "60px" : "0px",
                      overflow: "hidden",
                      transition: "max-height 0.25s ease, opacity 0.25s ease",
                      opacity: isHovered ? 1 : 0,
                      marginTop: isHovered ? "2px" : "0px",
                    }}
                  >
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Photo row */}
              <div className="flex gap-2 flex-wrap">
                {(catPhotos?.previews || []).map((src, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      width: "72px",
                      height: "72px",
                      border: "1px solid var(--stone-mid)",
                    }}
                  >
                    <img
                      src={src}
                      alt={`${cat.label} ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".img-fallback")) {
                          const fallback = document.createElement("div");
                          fallback.className = "img-fallback";
                          fallback.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#F5F0E8;font-size:20px;";
                          fallback.textContent = cat.icon;
                          parent.prepend(fallback);
                        }
                      }}
                    />
                    <button
                      onClick={() => removePhoto(cat.id, i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        fontSize: "12px",
                        border: "none",
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}

                {count < 3 && (
                  <button
                    onClick={() => inputRefs.current[cat.id]?.click()}
                    className="rounded-lg flex flex-col items-center justify-center"
                    style={{
                      width: "72px",
                      height: "72px",
                      border: "1.5px dashed var(--stone-mid, #D4C9B5)",
                      background: "rgba(0,0,0,0.02)",
                      cursor: "pointer",
                      color: "#9A9A8E",
                      fontSize: "10px",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add
                  </button>
                )}

                <input
                  ref={(el) => { inputRefs.current[cat.id] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={(e) => {
                    handleFiles(cat.id, e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Notes */}
      <Card>
        <CardContent style={{ padding: "16px" }}>
          <p
            style={{
              fontSize: "13px",
              color: "#2C2C24",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            Anything else your stylist should know?
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional — tell us what caught your eye"
            rows={3}
          />
        </CardContent>
      </Card>

      {error && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--garnet)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={totalPhotos === 0 || uploading}
        className="w-full"
        size="lg"
      >
        {uploading
          ? "Uploading..."
          : `Submit ${totalPhotos} Photo${totalPhotos !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
