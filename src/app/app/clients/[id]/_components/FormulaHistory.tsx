"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus, Eye, EyeOff } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { FormulaEntry, ServiceType, ParsedBowl } from "@/lib/types";

interface FormulaHistoryProps {
  clientId: string;
  entries: FormulaEntry[];
  serviceTypes: ServiceType[];
}

function BowlCard({ bowl }: { bowl: ParsedBowl }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
      <p className="text-sm font-medium text-emerald-400">{bowl.label}</p>
      <div className="space-y-1">
        {bowl.products.map((p, i) => (
          <p key={i} className="text-sm">
            {p.amount && <span className="text-muted-foreground">{p.amount} </span>}
            <span className="font-medium">{p.name}</span>
            {p.brand && <span className="text-muted-foreground"> ({p.brand})</span>}
          </p>
        ))}
      </div>
      {bowl.developer && (
        <p className="text-sm text-muted-foreground">
          Developer: {bowl.developer.volume}
          {bowl.developer.amount && ` — ${bowl.developer.amount}`}
        </p>
      )}
      {bowl.processingTime && (
        <p className="text-sm text-muted-foreground">
          Processing: {bowl.processingTime}
        </p>
      )}
      {bowl.applicationNotes && (
        <p className="text-sm italic text-muted-foreground">
          {bowl.applicationNotes}
        </p>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: FormulaEntry }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {formatDate(entry.serviceDate)}
        </span>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRaw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showRaw ? "Hide raw" : "Raw notes"}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-sm whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3 text-muted-foreground">
          {entry.rawNotes}
        </pre>
      ) : entry.parsedFormula?.bowls ? (
        <div className="space-y-3">
          {entry.parsedFormula.bowls.map((bowl, i) => (
            <BowlCard key={i} bowl={bowl} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p className="mb-1">AI formatting pending...</p>
          <pre className="whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3">
            {entry.rawNotes}
          </pre>
        </div>
      )}

      {entry.generalNotes && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm">{entry.generalNotes}</p>
        </div>
      )}
    </div>
  );
}

export function FormulaHistory({ clientId, entries, serviceTypes }: FormulaHistoryProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Group entries by service type
  const grouped = new Map<string, FormulaEntry[]>();
  for (const entry of entries) {
    const existing = grouped.get(entry.serviceTypeId) || [];
    existing.push(entry);
    grouped.set(entry.serviceTypeId, existing);
  }

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sort service types by their sort_order, only include ones that have entries
  const sortedTypes = serviceTypes
    .filter((st) => grouped.has(st.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Formula History</h3>
          <p className="text-sm text-muted-foreground">{entries.length} entries</p>
        </div>
        <Link href={`/app/formulas/log?clientId=${clientId}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Log Formula
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No formulas logged yet</p>
          <Link href={`/app/formulas/log?clientId=${clientId}`}>
            <Button size="sm" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Log First Formula
            </Button>
          </Link>
        </div>
      ) : (
        sortedTypes.map((st) => {
          const sectionEntries = grouped.get(st.id) || [];
          const isOpen = openSections.has(st.id);

          return (
            <div key={st.id} className="rounded-xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(st.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{st.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {sectionEntries.length} {sectionEntries.length === 1 ? "entry" : "entries"}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-3">
                  {sectionEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
