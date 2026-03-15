"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CommunicationPreferences } from "@/lib/types";

type Props = {
  initialPrefs: CommunicationPreferences;
};

export function CommsPrefsForm({ initialPrefs }: Props) {
  const [emailEnabled, setEmailEnabled] = useState(initialPrefs.emailEnabled);
  const [smsEnabled, setSmsEnabled] = useState(initialPrefs.smsEnabled);
  const [quietStart, setQuietStart] = useState(initialPrefs.quietHoursStart || "");
  const [quietEnd, setQuietEnd] = useState(initialPrefs.quietHoursEnd || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const anyChannelEnabled = emailEnabled || smsEnabled;

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/client/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled,
          smsEnabled,
          quietHoursStart: anyChannelEnabled && quietStart ? quietStart : null,
          quietHoursEnd: anyChannelEnabled && quietEnd ? quietEnd : null,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-on-stone-faint)",
    marginBottom: "4px",
    display: "block",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--text-on-stone-faint)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  };

  return (
    <div className="space-y-5">
      <h2
        className="text-lg"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        Notification Preferences
      </h2>

      <Card>
        <CardContent className="py-4 space-y-4">
          <p style={sectionLabel}>Channels</p>

          {/* Email toggle */}
          <label
            className="flex items-center justify-between cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
              Email notifications
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled}
              onClick={() => setEmailEnabled(!emailEnabled)}
              className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{
                background: emailEnabled ? "var(--brass)" : "var(--stone-mid)",
                border: "1px solid",
                borderColor: emailEnabled ? "var(--brass-warm)" : "var(--stone-mid)",
              }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full transition-transform"
                style={{
                  background: emailEnabled ? "var(--bark-deepest)" : "var(--stone-lightest)",
                  transform: emailEnabled ? "translateX(20px)" : "translateX(1px)",
                  marginTop: "1px",
                }}
              />
            </button>
          </label>

          {/* SMS toggle */}
          <label
            className="flex items-center justify-between cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ fontSize: "14px", color: "var(--text-on-stone)" }}>
              SMS notifications
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={smsEnabled}
              onClick={() => setSmsEnabled(!smsEnabled)}
              className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{
                background: smsEnabled ? "var(--brass)" : "var(--stone-mid)",
                border: "1px solid",
                borderColor: smsEnabled ? "var(--brass-warm)" : "var(--stone-mid)",
              }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full transition-transform"
                style={{
                  background: smsEnabled ? "var(--bark-deepest)" : "var(--stone-lightest)",
                  transform: smsEnabled ? "translateX(20px)" : "translateX(1px)",
                  marginTop: "1px",
                }}
              />
            </button>
          </label>

          {/* Quiet hours — only shown when at least one channel is enabled */}
          {anyChannelEnabled && (
            <div className="pt-2 space-y-3">
              <p style={sectionLabel}>Quiet Hours</p>
              <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)" }}>
                We won't send notifications during these hours.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Start</label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid var(--stone-mid)",
                      color: "var(--text-on-stone)",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End</label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid var(--stone-mid)",
                      color: "var(--text-on-stone)",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? "Saving..." : saved ? "Saved!" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
