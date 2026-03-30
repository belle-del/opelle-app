"use client";

import { useState } from "react";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";

export default function FloorSetupPage() {
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [catStatus, setCatStatus] = useState<string | null>(null);
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

      {/* Seed Categories */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24, marginBottom: 16,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          3. Seed Service Categories
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 16px" }}>
          Adds 8 default service categories (Haircut, Color, Highlight, etc.) with curriculum requirements.
        </p>
        <button
          onClick={async () => {
            setLoading(true); setCatStatus(null);
            try {
              const res = await fetch("/api/services/categories/seed", { method: "POST" });
              const data = await res.json();
              setCatStatus(data.success ? `Added ${data.count} categories: ${data.categories.join(", ")}` : data.message || `Error: ${data.error}`);
            } catch { setCatStatus("Failed to reach server"); }
            finally { setLoading(false); }
          }}
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: GARNET, color: "#fff", fontSize: 14, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? "Working..." : "Seed Categories"}
        </button>
        {catStatus && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: BRASS, marginTop: 12 }}>
            {catStatus}
          </p>
        )}
      </div>

      {/* Go to views */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          4. Open Views
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 16px" }}>
          Once students are seeded, use these views for the demo.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          href="/app/floor"
          style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 8, border: "none",
            background: BRASS, color: "#fff", fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Floor View →
        </a>
        <a
          href="/app/hours"
          style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 8, border: "none",
            background: GARNET, color: "#fff", fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Hour Tracking →
        </a>
        <a
          href="/app/progress"
          style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 8, border: `1px solid ${STONE_MID}`,
            background: "transparent", color: TEXT_MAIN, fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Progress →
        </a>
        </div>
      </div>

      {/* Migration SQL */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 24, marginTop: 16,
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 8px" }}>
          SQL Migrations
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT_FAINT, margin: "0 0 12px" }}>
          Run these in Supabase SQL Editor if the tables don&apos;t exist yet.
        </p>
        <details style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT_FAINT }}>
          <summary style={{ cursor: "pointer", marginBottom: 8, fontWeight: 500 }}>Floor Status Table</summary>
          <pre style={{ background: STONE, padding: 12, borderRadius: 8, overflow: "auto", fontSize: 11 }}>{`CREATE TABLE IF NOT EXISTS floor_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',
  status VARCHAR(20) DEFAULT 'clocked_out'
    CHECK (status IN ('clocked_out', 'available', 'with_client', 'on_break')),
  current_client_id UUID REFERENCES clients(id),
  current_service VARCHAR(100),
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  clocked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id)
);
ALTER TABLE floor_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_select" ON floor_status
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_all" ON floor_status
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_floor_status_workspace ON floor_status(workspace_id);
CREATE INDEX idx_floor_status_student ON floor_status(workspace_id, student_id);
ALTER PUBLICATION supabase_realtime ADD TABLE floor_status;`}</pre>
        </details>
        <details style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT_FAINT, marginTop: 8 }}>
          <summary style={{ cursor: "pointer", marginBottom: 8, fontWeight: 500 }}>Time Entries + Hour Totals Tables</summary>
          <pre style={{ background: STONE, padding: 12, borderRadius: 8, overflow: "auto", fontSize: 11 }}>{`CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON time_entries
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_time_entries_workspace ON time_entries(workspace_id);
CREATE INDEX idx_time_entries_student ON time_entries(workspace_id, student_id);

CREATE TABLE IF NOT EXISTS hour_totals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',
  total_hours DECIMAL(8,2) DEFAULT 0,
  verified_hours DECIMAL(8,2) DEFAULT 0,
  hours_by_category JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id)
);
ALTER TABLE hour_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON hour_totals
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_hour_totals_workspace ON hour_totals(workspace_id);`}</pre>
        </details>
      </div>
    </div>
  );
}
