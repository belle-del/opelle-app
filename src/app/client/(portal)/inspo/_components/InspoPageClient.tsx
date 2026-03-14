"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { InspoUploader } from "./InspoUploader";
import { InspoSubmissionsList } from "./InspoSubmissionsList";

type Submission = {
  id: string;
  client_notes: string | null;
  client_summary: string | null;
  feasibility: string | null;
  requires_consult: boolean;
  reviewed_by_stylist: boolean;
  created_at: string;
  photoUrls: string[];
};

export function InspoPageClient() {
  const [showUploader, setShowUploader] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/client/inspo");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  function handleSubmitted() {
    setShowUploader(false);
    setLoading(true);
    fetchSubmissions();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-xl"
          style={{
            fontFamily: "'Fraunces', serif",
            color: "var(--stone-lightest)",
          }}
        >
          Inspo
        </h1>
        {!showUploader && (
          <Button onClick={() => setShowUploader(true)} size="sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "6px" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Inspo
          </Button>
        )}
      </div>

      {showUploader && (
        <div className="space-y-3">
          <button
            onClick={() => setShowUploader(false)}
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
            Cancel
          </button>
          <InspoUploader onSubmitted={handleSubmitted} />
        </div>
      )}

      {!showUploader && (
        <>
          {loading ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-on-stone-faint)",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              Loading...
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-on-stone-ghost)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                Past Submissions
              </p>
              <InspoSubmissionsList submissions={submissions} />
            </>
          )}
        </>
      )}
    </div>
  );
}
