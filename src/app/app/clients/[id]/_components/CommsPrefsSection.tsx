"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CommunicationPreferences } from "@/lib/types";

interface CommsPrefsProps {
  clientId: string;
}

export function CommsPrefsSection({ clientId }: CommsPrefsProps) {
  const [prefs, setPrefs] = useState<CommunicationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local form state
  const [rebookWeeks, setRebookWeeks] = useState(6);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");

  useEffect(() => {
    fetch(`/api/client-comms-prefs?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data: CommunicationPreferences) => {
        setPrefs(data);
        setRebookWeeks(data.rebookReminderWeeks);
        setEmailEnabled(data.emailEnabled);
        setSmsEnabled(data.smsEnabled);
        setQuietStart(data.quietHoursStart || "");
        setQuietEnd(data.quietHoursEnd || "");
      })
      .catch(() => setError("Failed to load communication preferences"));
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/client-comms-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          rebookReminderWeeks: rebookWeeks,
          emailEnabled,
          smsEnabled,
          quietHoursStart: quietStart || null,
          quietHoursEnd: quietEnd || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const updated = await res.json();
      setPrefs(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs && !error) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Loading communication preferences...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Communication Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Rebook Reminder */}
        <div>
          <Label htmlFor="rebookWeeks">Remind to rebook after</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              id="rebookWeeks"
              type="number"
              min={1}
              max={52}
              value={rebookWeeks}
              onChange={(e) => setRebookWeeks(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">weeks</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            How long after the last visit to send a rebook reminder
          </p>
        </div>

        {/* Notification Toggles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label
            htmlFor="emailEnabled"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <input
              id="emailEnabled"
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--garnet)]"
            />
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Send reminders via email
              </p>
            </div>
          </label>

          <label
            htmlFor="smsEnabled"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <input
              id="smsEnabled"
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--garnet)]"
            />
            <div>
              <p className="text-sm font-medium">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">
                Send reminders via text message
              </p>
            </div>
          </label>
        </div>

        {/* Quiet Hours */}
        <div>
          <Label>Quiet Hours (optional)</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            No notifications will be sent during these hours
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quietStart" className="text-xs text-muted-foreground">
                Start
              </Label>
              <Input
                id="quietStart"
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quietEnd" className="text-xs text-muted-foreground">
                End
              </Label>
              <Input
                id="quietEnd"
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
          {saved && (
            <span className="text-sm" style={{ color: "var(--brass)" }}>Saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
