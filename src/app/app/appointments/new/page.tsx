"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft, X, ChevronDown } from "lucide-react";
import type { Client, ServiceType } from "@/lib/types";

// Service type with optional duration (uses durationMinutes from ServiceType)
type ServiceTypeWithDuration = ServiceType;

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const preselectedStartAt = searchParams.get("startAt");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeWithDuration[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [durationMins, setDurationMins] = useState(60);
  const [durationManuallySet, setDurationManuallySet] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/service-types").then((r) => r.json()),
    ]).then(([clientsData, typesData]) => {
      if (Array.isArray(clientsData)) setClients(clientsData);
      if (Array.isArray(typesData)) setServiceTypes(typesData);
    }).catch(() => setError("Failed to load data"));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-calculate duration from selected services (unless manually overridden)
  useEffect(() => {
    if (durationManuallySet || selectedServices.length === 0) return;
    const total = selectedServices.reduce((sum, name) => {
      const st = serviceTypes.find((t) => t.name === name);
      return sum + (st?.durationMinutes || 60);
    }, 0);
    setDurationMins(total);
  }, [selectedServices, serviceTypes, durationManuallySet]);

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const removeService = (name: string) => {
    setSelectedServices((prev) => prev.filter((s) => s !== name));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const serviceName = selectedServices.length > 0
      ? selectedServices.join(" + ")
      : String(formData.get("serviceNameFallback") || "").trim();

    if (!serviceName) {
      setError("Please select at least one service");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.get("clientId"),
          serviceName,
          startAt: String(formData.get("startAt")) + ":00",
          durationMins,
          notes: formData.get("notes") || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create appointment");
      }

      const appointment = await res.json();
      router.push(`/app/appointments/${appointment.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Default to now + 1 hour, rounded to nearest 30 min (local time)
  const defaultDateTime = () => {
    if (preselectedStartAt) return preselectedStartAt;
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(d.getMinutes() >= 30 ? 30 : 0);
    d.setSeconds(0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#6B5D4A" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </Link>
        <div>
          <h2 className="text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "#2C2C24" }}>New Appointment</h2>
          <p className="text-muted-foreground">
            Schedule a new appointment with a client.
          </p>
        </div>
      </header>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="clientId">Client *</Label>
              <Select
                id="clientId"
                name="clientId"
                required
                defaultValue={preselectedClientId || ""}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Link href="/app/clients/new" className="hover:underline" style={{ color: "var(--brass)" }}>
                    Add a client first
                  </Link>

                </p>
              )}
            </div>

            {/* Multi-select service dropdown */}
            <div>
              <Label>Services *</Label>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                  style={{
                    width: "100%",
                    minHeight: "38px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--stone-mid)",
                    background: "var(--stone-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    textAlign: "left",
                    fontSize: "13px",
                    color: selectedServices.length > 0 ? "var(--text-on-stone)" : "var(--text-on-stone-ghost)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
                    {selectedServices.length === 0 ? (
                      <span>Select services…</span>
                    ) : (
                      selectedServices.map((name) => (
                        <span
                          key={name}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            fontSize: "11px",
                            fontWeight: 500,
                            background: "var(--garnet-wash)",
                            color: "var(--garnet)",
                            border: "1px solid rgba(68,6,6,0.15)",
                          }}
                        >
                          {name}
                          <span
                            onClick={(e) => { e.stopPropagation(); removeService(name); }}
                            style={{ cursor: "pointer", display: "flex" }}
                          >
                            <X size={10} />
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown size={14} style={{ color: "var(--text-on-stone-faint)", flexShrink: 0 }} />
                </button>

                {showServiceDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    background: "var(--stone-card)",
                    border: "1px solid var(--stone-mid)",
                    borderRadius: "6px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    zIndex: 50,
                    maxHeight: "240px",
                    overflow: "auto",
                  }}>
                    {serviceTypes.length === 0 ? (
                      <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center" }}>
                        No service types configured.{" "}
                        <Link href="/app/settings" style={{ color: "var(--status-confirmed)" }}>
                          Add in Settings
                        </Link>
                      </div>
                    ) : (
                      serviceTypes.map((st) => {
                        const isSelected = selectedServices.includes(st.name);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => toggleService(st.name)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: isSelected ? "rgba(68,6,6,0.06)" : "transparent",
                              border: "none",
                              borderBottom: "1px solid var(--stone-mid)",
                              fontSize: "12px",
                              color: "var(--text-on-stone)",
                              textAlign: "left",
                              transition: "background 0.1s",
                            }}
                          >
                            <div style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "3px",
                              border: isSelected ? "none" : "1px solid var(--stone-warm)",
                              background: isSelected ? "var(--garnet)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                            </div>
                            <span style={{ flex: 1 }}>{st.name}</span>
                            {st.durationMinutes && (
                              <span style={{ fontSize: "10px", color: "var(--text-on-stone-ghost)" }}>
                                {st.durationMinutes}min
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Fallback text input if no service types exist */}
              {serviceTypes.length === 0 && (
                <Input
                  name="serviceNameFallback"
                  placeholder="e.g., Balayage, Haircut, Color Touch-up"
                  className="mt-2"
                />
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="startAt">Date & Time *</Label>
                <Input
                  id="startAt"
                  name="startAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultDateTime()}
                />
              </div>
              <div>
                <Label htmlFor="durationMins">Duration</Label>
                <Select
                  id="durationMins"
                  name="durationMins"
                  value={String(durationMins)}
                  onChange={(e) => {
                    setDurationMins(parseInt(e.target.value));
                    setDurationManuallySet(true);
                  }}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="75">1h 15m</option>
                  <option value="90">1.5 hours</option>
                  <option value="105">1h 45m</option>
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                  <option value="210">3.5 hours</option>
                  <option value="240">4 hours</option>
                  <option value="300">5 hours</option>
                </Select>
                {selectedServices.length > 0 && !durationManuallySet && (
                  <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "4px" }}>
                    Auto-calculated from services
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any prep notes, special requests..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || clients.length === 0}>
                {loading ? "Scheduling..." : "Schedule Appointment"}
              </Button>
              <Link href="/app/appointments">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
