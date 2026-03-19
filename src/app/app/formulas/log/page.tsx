"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FlaskConical, Check, Loader2 } from "lucide-react";
import { ClientPicker } from "../_components/ClientPicker";
import { FormulaSuggestion } from "../_components/FormulaSuggestion";
import type { ServiceType } from "@/lib/types";

export default function LogFormulaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") || "";

  const [clientId, setClientId] = useState(preselectedClientId);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rawNotes, setRawNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load service types (seed if empty)
  useEffect(() => {
    async function loadServiceTypes() {
      let res = await fetch("/api/service-types");
      let types = await res.json();

      if (Array.isArray(types) && types.length === 0) {
        // Seed defaults
        res = await fetch("/api/service-types/seed", { method: "POST" });
        types = await res.json();
      }

      if (Array.isArray(types)) {
        setServiceTypes(types);
      }
    }
    loadServiceTypes().catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!clientId || !serviceTypeId || !rawNotes.trim()) {
      setError("Please fill in client, service type, and formula notes.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Save the formula entry
      const res = await fetch("/api/formula-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceTypeId,
          rawNotes: rawNotes.trim(),
          generalNotes: generalNotes.trim() || undefined,
          serviceDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save formula");
      }

      const entry = await res.json();
      setSaved(true);

      // 2. Trigger AI parsing in background
      setParsing(true);
      try {
        const parseRes = await fetch("/api/formulas/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawNotes: rawNotes.trim() }),
        });

        if (parseRes.ok) {
          const parsed = await parseRes.json();
          // Update the entry with parsed formula
          await fetch(`/api/formula-entries/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parsedFormula: parsed }),
          });
        }
      } catch {
        // AI parsing failed — that's OK, raw notes are saved
        console.error("AI parsing failed, raw notes saved");
      } finally {
        setParsing(false);
      }

      // 3. Redirect to client profile after short delay
      setTimeout(() => {
        router.push(`/app/clients/${clientId}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <header style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
          Notepad
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
          Log Formula
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-on-bark, #F5F0E8)", marginTop: "4px" }}>
          Jot down what you mixed — AI will format it for you.
        </p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-6">
          {error && (
            <div style={{ borderRadius: "8px", background: "rgba(117,18,18,0.1)", border: "1px solid rgba(117,18,18,0.2)", padding: "12px", fontSize: "13px", color: "var(--status-low)" }}>
              {error}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2" style={{ borderRadius: "8px", background: "rgba(143,173,200,0.1)", border: "1px solid rgba(143,173,200,0.2)", padding: "12px", fontSize: "13px", color: "var(--status-confirmed)" }}>
              <Check className="w-4 h-4" />
              Formula saved!
              {parsing && (
                <span className="flex items-center gap-1 ml-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI formatting...
                </span>
              )}
            </div>
          )}

          {/* Client Picker */}
          <div>
            <Label className="mb-2 block">Client *</Label>
            <ClientPicker value={clientId} onChange={setClientId} />
          </div>

          {/* Service Type + Date */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="serviceType" className="mb-2 block">Service Type *</Label>
              <select
                id="serviceType"
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--stone-mid)", background: "rgba(0,0,0,0.04)", padding: "10px 14px", fontSize: "14px", color: "var(--text-on-stone)", outline: "none" }}
              >
                <option value="">Select service type</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="serviceDate" className="mb-2 block">Date</Label>
              <Input
                id="serviceDate"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
          </div>

          {/* Formula Suggestion (Kernel-powered) */}
          <FormulaSuggestion
            clientId={clientId}
            serviceTypeName={serviceTypes.find((st) => st.id === serviceTypeId)?.name ?? ""}
          />

          {/* Formula Notes */}
          <div>
            <Label htmlFor="rawNotes" className="mb-2 block">
              Formula Notes *
            </Label>
            <Textarea
              id="rawNotes"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder={"e.g., Bowl 1: 2 oz of 8.6N and 2 of 7.6N with 4 oz of 10 vol. 35 min at roots to midshaft.\n\nBowl 2: Redken Flash Lift + 30vol 1:2 in foils on crown..."}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Write naturally — AI will parse your bowls, products, amounts, and timing.
            </p>
          </div>

          {/* General Notes */}
          <div>
            <Label htmlFor="generalNotes" className="mb-2 block">
              General Notes
            </Label>
            <Textarea
              id="generalNotes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Client preferences, plans for next visit, observations..."
              rows={3}
            />
          </div>

          {/* Save */}
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full sm:w-auto"
              style={{ background: "var(--status-confirmed)", border: "1px solid var(--status-confirmed)" }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Save Formula
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
