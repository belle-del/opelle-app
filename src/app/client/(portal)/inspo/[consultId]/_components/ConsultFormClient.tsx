"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Question = {
  id: string;
  question: string;
  type: "yes_no" | "multiple_choice" | "free_text" | "scale";
  options?: string[];
};

type ConsultData = {
  id: string;
  clientNotes: string | null;
  clientSummary: string | null;
  feasibility: string | null;
  requiresConsult: boolean;
  questions: Question[];
  photoUrls: string[];
  submittedAnswers: Record<string, unknown> | null;
  submittedAt: string | null;
  createdAt: string;
};

type Props = {
  consultId: string;
  stylistName: string;
};

export function ConsultFormClient({ consultId, stylistName }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ConsultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/client/inspo/${consultId}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.submittedAnswers) {
          setSubmitted(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [consultId]);

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/client/inspo/${consultId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
          Consult form not found
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8">
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
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2
            className="text-2xl mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--stone-lightest)",
            }}
          >
            Sent to your stylist
          </h2>
          <p style={{ fontSize: "14px", color: "var(--stone-shadow)" }}>
            {stylistName} will review your answers and be in touch soon.
          </p>
        </div>
        <Button
          onClick={() => router.push("/client/inspo")}
          className="w-full"
          size="lg"
        >
          Back to Inspo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/client/inspo")}
        style={{
          color: "var(--brass)",
          fontSize: "13px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Inspo
      </button>

      {/* Summary */}
      {data.clientSummary && (
        <Card>
          <CardContent className="py-4">
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-on-stone)",
                lineHeight: 1.6,
              }}
            >
              {data.clientSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Consult form header */}
      <div>
        <h1
          className="text-xl"
          style={{
            fontFamily: "'Fraunces', serif",
            color: "var(--stone-lightest)",
          }}
        >
          Quick Questions
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--stone-shadow)",
            marginTop: "4px",
          }}
        >
          Based on your inspo photos, {stylistName} would like to know a bit
          more
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {data.questions.map((q) => (
          <Card key={q.id}>
            <CardContent className="py-4">
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-on-stone)",
                  fontWeight: 500,
                  marginBottom: "12px",
                }}
              >
                {q.question}
              </p>

              {/* Yes/No */}
              {q.type === "yes_no" && (
                <div className="flex gap-2">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                      }
                      className="flex-1 py-3 rounded-lg transition-all"
                      style={{
                        fontSize: "14px",
                        background:
                          answers[q.id] === opt
                            ? "var(--brass)"
                            : "rgba(0,0,0,0.04)",
                        color:
                          answers[q.id] === opt
                            ? "var(--bark-deepest)"
                            : "var(--text-on-stone-dim)",
                        border:
                          answers[q.id] === opt
                            ? "1px solid var(--brass-warm)"
                            : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple choice */}
              {q.type === "multiple_choice" && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                      }
                      className="px-4 py-2.5 rounded-lg transition-all"
                      style={{
                        fontSize: "13px",
                        background:
                          answers[q.id] === opt
                            ? "var(--brass)"
                            : "rgba(0,0,0,0.04)",
                        color:
                          answers[q.id] === opt
                            ? "var(--bark-deepest)"
                            : "var(--text-on-stone-dim)",
                        border:
                          answers[q.id] === opt
                            ? "1px solid var(--brass-warm)"
                            : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Free text */}
              {q.type === "free_text" && (
                <Textarea
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  placeholder="Type your answer..."
                  rows={3}
                />
              )}

              {/* Scale (1-5) */}
              {q.type === "scale" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: n }))
                      }
                      className="flex-1 py-3 rounded-lg transition-all"
                      style={{
                        fontSize: "16px",
                        fontWeight: 500,
                        background:
                          answers[q.id] === n
                            ? "var(--brass)"
                            : "rgba(0,0,0,0.04)",
                        color:
                          answers[q.id] === n
                            ? "var(--bark-deepest)"
                            : "var(--text-on-stone-dim)",
                        border:
                          answers[q.id] === n
                            ? "1px solid var(--brass-warm)"
                            : "1px solid var(--stone-mid)",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inspo photos for reference */}
      {data.photoUrls.length > 0 && (
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-on-stone-ghost)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Your Inspo Photos
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {data.photoUrls.map((url, i) => (
              <div
                key={i}
                className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                style={{ border: "1px solid var(--stone-mid)" }}
              >
                <img
                  src={url}
                  alt={`Inspo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? "Submitting..." : "Submit Answers"}
      </Button>
    </div>
  );
}
