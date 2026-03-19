"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, ChevronRight } from "lucide-react";

type Question = {
  id: string;
  question: string;
  type: string;
  options?: string[];
};

type PerPhotoQuestions = {
  photoIndex: number;
  questions: Question[];
};

type Props = {
  submissionId: string;
  photoUrls: string[];
  aiAnalysis?: {
    perPhotoQuestions?: PerPhotoQuestions[];
    generatedFormQuestions?: Question[];
  };
  onComplete: () => void;
};

export function InspoFollowUp({
  submissionId,
  photoUrls,
  aiAnalysis,
  onComplete,
}: Props) {
  // Build flat question list with photo associations
  const allQuestions: Array<Question & { photoIndex?: number }> = [];

  if (aiAnalysis?.perPhotoQuestions) {
    for (const group of aiAnalysis.perPhotoQuestions) {
      for (const q of group.questions) {
        allQuestions.push({ ...q, photoIndex: group.photoIndex });
      }
    }
  } else if (aiAnalysis?.generatedFormQuestions) {
    // Fallback: distribute questions across photos
    for (const q of aiAnalysis.generatedFormQuestions) {
      allQuestions.push(q);
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clarifyMode, setClarifyMode] = useState(false);
  const [clarifyText, setClarifyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<Question[]>([]);
  const [done, setDone] = useState(false);

  const totalQuestions = allQuestions.length + followUpQuestions.length;
  const currentQ =
    currentIndex < allQuestions.length
      ? allQuestions[currentIndex]
      : followUpQuestions[currentIndex - allQuestions.length];
  const photoIdx = currentIndex < allQuestions.length ? allQuestions[currentIndex]?.photoIndex : undefined;

  function selectOption(option: string) {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
    setClarifyMode(false);
    setClarifyText("");
    advance();
  }

  function submitClarify() {
    if (!currentQ || !clarifyText.trim()) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: clarifyText.trim() }));
    setClarifyMode(false);
    setClarifyText("");
    advance();
  }

  async function advance() {
    const nextIndex = currentIndex + 1;

    if (nextIndex < totalQuestions) {
      setCurrentIndex(nextIndex);
      return;
    }

    // All questions answered — submit and check for follow-ups
    setSubmitting(true);
    try {
      const res = await fetch(`/api/client/inspo/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const data = await res.json();
        // Check for follow-up questions from re-scan
        if (data.followUpQuestions && data.followUpQuestions.length > 0) {
          setFollowUpQuestions((prev) => [...prev, ...data.followUpQuestions]);
          setCurrentIndex(nextIndex);
        } else {
          setDone(true);
        }
      } else {
        setDone(true);
      }
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle
            style={{
              width: "48px",
              height: "48px",
              color: "var(--status-confirmed, #4A7C59)",
              margin: "0 auto 16px",
            }}
          />
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "18px",
              color: "#2C2C24",
              marginBottom: "8px",
            }}
          >
            All done!
          </h3>
          <p style={{ fontSize: "13px", color: "#7A7A72", marginBottom: "20px" }}>
            Your responses have been sent to your stylist.
          </p>
          <Button onClick={onComplete}>Back to Inspo</Button>
        </CardContent>
      </Card>
    );
  }

  if (submitting) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2
            className="animate-spin"
            style={{
              width: "32px",
              height: "32px",
              color: "var(--brass, #C4AB70)",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: "13px", color: "#7A7A72" }}>
            Checking for follow-up questions...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentQ) {
    // No questions — skip straight to done
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle
            style={{
              width: "48px",
              height: "48px",
              color: "var(--status-confirmed, #4A7C59)",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: "13px", color: "#7A7A72", marginBottom: "20px" }}>
            Your inspo has been submitted.
          </p>
          <Button onClick={onComplete}>Back to Inspo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            flex: 1,
            height: "3px",
            borderRadius: "2px",
            background: "#E8E0D0",
          }}
        >
          <div
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              height: "100%",
              borderRadius: "2px",
              background: "var(--brass, #C4AB70)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ fontSize: "11px", color: "#7A7A72" }}>
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Photo preview */}
      {photoIdx !== undefined && photoUrls[photoIdx] && (
        <div style={{ borderRadius: "12px", overflow: "hidden", maxHeight: "240px" }}>
          <img
            src={photoUrls[photoIdx]}
            alt={`Inspo photo ${photoIdx + 1}`}
            style={{
              width: "100%",
              height: "240px",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* Question */}
      <Card>
        <CardContent style={{ padding: "20px" }}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "17px",
              color: "#2C2C24",
              lineHeight: "1.5",
              marginBottom: "16px",
            }}
          >
            {currentQ.question}
          </p>

          {!clarifyMode && (
            <div className="space-y-2">
              {/* AI-generated options */}
              {currentQ.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #E8E0D0",
                    background: "#FAF8F3",
                    fontSize: "13px",
                    color: "#2C2C24",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {option}
                  <ChevronRight
                    style={{ width: "14px", height: "14px", color: "#7A7A72", flexShrink: 0 }}
                  />
                </button>
              ))}

              {/* Clarify button */}
              <button
                onClick={() => setClarifyMode(true)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px dashed #D4C9B5",
                  background: "transparent",
                  fontSize: "12px",
                  color: "#7A7A72",
                  cursor: "pointer",
                }}
              >
                I want to clarify in my own words
              </button>
            </div>
          )}

          {clarifyMode && (
            <div className="space-y-3">
              <textarea
                value={clarifyText}
                onChange={(e) => setClarifyText(e.target.value)}
                placeholder="Tell us in your own words..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #E8E0D0",
                  fontSize: "13px",
                  color: "#2C2C24",
                  resize: "vertical",
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  onClick={submitClarify}
                  disabled={!clarifyText.trim()}
                  style={{ fontSize: "12px" }}
                >
                  Submit
                </Button>
                <Button
                  onClick={() => {
                    setClarifyMode(false);
                    setClarifyText("");
                  }}
                  variant="ghost"
                  style={{ fontSize: "12px" }}
                >
                  Back to options
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
