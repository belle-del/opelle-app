"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormulaSearchBar } from "./_components/FormulaSearchBar";
import type { FormulaEntry, ServiceType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function highlightMatch(text: string, search: string): React.ReactNode[] {
  if (!search.trim()) return [<span key="0">{text}</span>];
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: "rgba(196,171,112,0.3)", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>{part}</mark>
      : <span key={i}>{part}</span>
  );
}

function FormulaCard({ entry, search, clientNames, serviceTypeNames }: {
  entry: FormulaEntry;
  search: string;
  clientNames: Map<string, string>;
  serviceTypeNames: Map<string, string>;
}) {
  const clientName = clientNames.get(entry.clientId) || "Unknown client";
  const serviceTypeName = serviceTypeNames.get(entry.serviceTypeId) || "";
  const preview = entry.rawNotes.slice(0, 220);

  return (
    <Card>
      <CardContent className="p-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href={`/app/clients/${entry.clientId}`}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-on-stone)", textDecoration: "none" }}
            >
              {clientName}
            </Link>
            {serviceTypeName && (
              <span style={{
                fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--text-on-stone-faint)", padding: "2px 8px", borderRadius: "100px",
                border: "1px solid var(--stone-mid)",
              }}>
                {serviceTypeName}
              </span>
            )}
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-on-stone-ghost)" }}>
            {formatDate(entry.serviceDate)}
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-dim)", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {highlightMatch(preview, search)}
          {entry.rawNotes.length > 220 && <span style={{ color: "var(--text-on-stone-ghost)" }}>…</span>}
        </p>
        {entry.generalNotes && (
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "8px", fontStyle: "italic", borderTop: "1px solid var(--stone-mid)", paddingTop: "8px" }}>
            {entry.generalNotes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FormulasPage() {
  const [entries, setEntries] = useState<FormulaEntry[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [serviceTypeNames, setServiceTypeNames] = useState<Map<string, string>>(new Map());
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    Promise.all([
      fetch("/api/service-types").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([types, clients]) => {
      if (Array.isArray(types)) {
        setServiceTypes(types);
        const stMap = new Map<string, string>();
        for (const st of types) stMap.set(st.id, st.name);
        setServiceTypeNames(stMap);
      }
      if (Array.isArray(clients)) {
        const map = new Map<string, string>();
        for (const c of clients) {
          map.set(c.id, [c.firstName, c.lastName].filter(Boolean).join(" "));
        }
        setClientNames(map);
      }
    }).catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (serviceTypeId) params.set("serviceTypeId", serviceTypeId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/formula-entries?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [serviceTypeId, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const hasFilters = !!(debouncedSearch || serviceTypeId || dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
            Practice
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
            Formulas
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-on-bark, #F5F0E8)", marginTop: "4px" }}>
            {loading ? "Loading…" : `${entries.length} formula${entries.length !== 1 ? "s" : ""}${hasFilters ? " matching filters" : ""}`}
          </p>
        </div>
        <Link href="/app/formulas/log">
          <button style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", borderRadius: "6px",
            background: "var(--garnet)", border: "1px solid var(--garnet-vivid)",
            color: "var(--stone-lightest)", fontSize: "12px", fontWeight: 500,
            letterSpacing: "0.05em",
          }}>
            <FlaskConical style={{ width: "13px", height: "13px" }} />
            Log Formula
          </button>
        </Link>
      </header>

      <Card>
        <CardContent className="p-4">
          <FormulaSearchBar
            search={search} onSearchChange={setSearch}
            serviceTypeId={serviceTypeId} onServiceTypeChange={setServiceTypeId}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo} onDateToChange={setDateTo}
            serviceTypes={serviceTypes}
          />
        </CardContent>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-on-bark-faint)", fontSize: "14px" }}>
          Loading formulas…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <FlaskConical style={{ width: "32px", height: "32px", margin: "0 auto 12px", color: "var(--text-on-bark-ghost)" }} />
          <p style={{ fontSize: "14px", color: "var(--text-on-bark-faint)", marginBottom: "16px" }}>
            {hasFilters ? "No formulas match your filters" : "No formulas logged yet"}
          </p>
          {!hasFilters && (
            <Link href="/app/formulas/log">
              <button style={{
                padding: "8px 16px", borderRadius: "6px",
                background: "var(--garnet)", border: "1px solid var(--garnet-vivid)",
                color: "var(--stone-lightest)", fontSize: "12px",
              }}>
                Log your first formula
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <FormulaCard
              key={entry.id}
              entry={entry}
              search={debouncedSearch}
              clientNames={clientNames}
              serviceTypeNames={serviceTypeNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
