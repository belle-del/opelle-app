"use client";

import { useState } from "react";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";

export default function FloorSetupPage() {
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function seedStudents() {
    setLoading(true);
    setSeedStatus(null);
    try {
      const res = await fetch("/api/floor/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedStatus(`Added ${data.count} demo students: ${data.students.join(", ")}`);
      } else if (data.message) {
        setSeedStatus(data.message);
      } else {
        setSeedStatus(`Error: ${data.error || "Unknown error"}`);
      }
    } catch {
      setSeedStatus("Failed to reach server");
    } finally {
      setLoading(false);
    }
  }

  async function resetFloor() {
    setLoading(true);
    setResetStatus(null);
    try {
      const res = await fetch("/api/floor/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetStatus(`Reset ${data.count} students back to clocked out`);
      } else {
        setResetStatus(`Error: ${data.error || "Unknown error"}`);
      }
    } catch {
      setResetStatus("Failed to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, marginBottom: 8 }}>
        Floor View Setup
      </h1>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_FAINT, marginBottom: 32 }}>
        Demo setup tools for the clinic floor view.
      </p>

      {/* Seed Students */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24, marginBottom: 16,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          1. Seed Demo Students
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 16px" }}>
          Adds 12 mock students to the floor view. Only runs once — safe to click again.
        </p>
        <button
          onClick={seedStudents}
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: GARNET, color: "#fff", fontSize: 14, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? "Working..." : "Seed Students"}
        </button>
        {seedStatus && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: BRASS, marginTop: 12 }}>
            {seedStatus}
          </p>
        )}
      </div>

      {/* Reset Floor */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24, marginBottom: 16,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          2. Reset Floor
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 16px" }}>
          Clocks out all students and clears assignments. Good for resetting before a demo.
        </p>
        <button
          onClick={resetFloor}
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 8, border: `1px solid ${STONE_MID}`,
            background: "transparent", color: TEXT_MAIN, fontSize: 14, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? "Working..." : "Reset All to Clocked Out"}
        </button>
        {resetStatus && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: BRASS, marginTop: 12 }}>
            {resetStatus}
          </p>
        )}
      </div>

      {/* Go to Floor View */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          3. Open Floor View
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 16px" }}>
          Once students are seeded, go to the floor view to demo.
        </p>
        <a
          href="/app/floor"
          style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 8, border: "none",
            background: BRASS, color: "#fff", fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Go to Floor View →
        </a>
      </div>
    </div>
  );
}
