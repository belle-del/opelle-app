"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { Client } from "@/lib/types";

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then(setClients)
      .catch(() => setError("Failed to load clients"));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.get("clientId"),
          serviceName: formData.get("serviceName"),
          startAt: new Date(String(formData.get("startAt"))).toISOString(),
          durationMins: parseInt(String(formData.get("durationMins"))) || 60,
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

  // Default to now + 1 hour, rounded to nearest 30 min
  const defaultDateTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(d.getMinutes() >= 30 ? 30 : 0);
    d.setSeconds(0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </Link>
        <div>
          <h2 className="text-3xl font-semibold">New Appointment</h2>
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
                  <Link href="/app/clients/new" className="text-emerald-400 hover:underline">
                    Add a client first
                  </Link>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="serviceName">Service *</Label>
              <Input
                id="serviceName"
                name="serviceName"
                required
                placeholder="e.g., Balayage, Haircut, Color Touch-up"
              />
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
                <Label htmlFor="durationMins">Duration (minutes)</Label>
                <Select id="durationMins" name="durationMins" defaultValue="60">
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </Select>
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
