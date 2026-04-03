"use client";

import { useState } from "react";

export default function SeedPage() {
  const [status, setStatus] = useState<string>("Ready to seed demo data.");
  const [loading, setLoading] = useState(false);

  async function handleSeed() {
    setLoading(true);
    setStatus("Seeding...");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus(
          `Done! Seeded: ${data.seeded.clients} clients, ${data.seeded.products} products, ${data.seeded.appointments} appointments, ${data.seeded.formulaEntries} formulas, ${data.seeded.tasks} tasks, ${data.seeded.activityLog} activity entries.`
        );
      } else {
        setStatus(`Error: ${data.error} — ${data.details || ""}`);
      }
    } catch (e) {
      setStatus(`Network error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Seed Demo Data</h1>
      <p style={{ marginBottom: 24, color: "#666" }}>
        This will clear existing data and populate your workspace with realistic
        demo data (Redken products, clients, appointments, formulas, tasks).
      </p>
      <button
        onClick={handleSeed}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          background: loading ? "#999" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Seeding..." : "Seed Demo Data"}
      </button>
      <p style={{ marginTop: 24, padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
        {status}
      </p>
    </div>
  );
}
