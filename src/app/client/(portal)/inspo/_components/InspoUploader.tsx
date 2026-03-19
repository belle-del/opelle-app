"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InspoFollowUp } from "./InspoFollowUp";

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

type CategoryId = (typeof CATEGORIES)[number]["id"];

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
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalPhotos = Object.values(photosByCategory).reduce(
    (sum, cat) => sum + cat.files.length,
    0
  );

  function handleFiles(categoryId: string, files: FileList | null) {
    if (!files) return;
    const current = photosByCategory[categoryId]?.files.length || 0;
    const newFiles = Array.from(files).slice(0, 3 - current);
    const validFiles = newFiles.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(f.type)
    );
    if (validFiles.length === 0) return;

    setPhotosByCategory((prev) => {
      const existing = prev[categoryId] || { files: [], previews: [] };
      return {
        ...prev,
        [categoryId]: {
          files: [...existing.files, ...validFiles],
          previews: existing.previews, // updated below via FileReader
        },
      };
    });

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotosByCategory((prev) => {
          const existing = prev[categoryId] || { files: [], previews: [] };
          return {
            ...prev,
            [categoryId]: {
              ...existing,
              previews: [...existing.previews, e.target?.result as string],
            },
          };
        });
      };
      reader.readAsDataURL(file);
    });
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
        formData.append(`photo${photoIndex}`, file);
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

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      const allPreviews = Object.values(photosByCategory).flatMap((c) => c.previews);

      const hasQuestions =
        data.aiAnalysis?.perPhotoQuestions?.length > 0 ||
        data.aiAnalysis?.generatedFormQuestions?.length > 0;

      if (hasQuestions) {
        setSubmission({
          id: data.id,
          photoUrls: allPreviews,
          aiAnalysis: data.aiAnalysis,
        });
      } else {
        onSubmitted();
      }
    } catch {
      setError("Something went wrong. Please try again.");
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
            Our AI is reviewing your photos and preparing personalized questions.
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
