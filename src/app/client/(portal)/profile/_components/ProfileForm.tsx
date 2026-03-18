"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/types";

type Props = {
  client: Client;
  stylistName: string;
  workspaceName: string;
};

export function ProfileForm({ client, stylistName, workspaceName }: Props) {
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName || "");
  const [pronouns, setPronouns] = useState(client.pronouns || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [hairGoals, setHairGoals] = useState(client.preferenceProfile?.styleNotes || "");
  const [allergies, setAllergies] = useState(client.preferenceProfile?.allergies || "");
  const [lifestyleNotes, setLifestyleNotes] = useState(client.preferenceProfile?.lifestyleNotes || "");
  const [maintenanceLevel, setMaintenanceLevel] = useState(client.preferenceProfile?.maintenanceLevel || "");
  const [visitCadence, setVisitCadence] = useState(
    client.preferenceProfile?.visitCadenceDays
      ? `${client.preferenceProfile.visitCadenceDays}`
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          pronouns: pronouns.trim() || null,
          phone: phone.trim() || null,
          preference_profile: {
            ...(client.preferenceProfile || {}),
            styleNotes: hairGoals.trim(),
            allergies: allergies.trim(),
            lifestyleNotes: lifestyleNotes.trim(),
            maintenanceLevel: maintenanceLevel || undefined,
            visitCadenceDays: visitCadence ? parseInt(visitCadence) : undefined,
          },
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

  return (
    <div className="space-y-5">
      <h1
        className="text-xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        Profile
      </h1>

      {/* Personal Info */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-on-stone-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
            }}
          >
            Personal Info
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
                First name
              </label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
                Last name
              </label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Pronouns
            </label>
            <Input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. she/her"
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Phone
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Email
            </label>
            <div
              className="px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(0,0,0,0.04)", fontSize: "14px", color: "var(--text-on-stone-faint)" }}
            >
              {client.email || "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hair Preferences */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-on-stone-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
            }}
          >
            Hair Preferences
          </p>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Hair goals
            </label>
            <Textarea
              value={hairGoals}
              onChange={(e) => setHairGoals(e.target.value)}
              placeholder="What are you going for?"
              rows={3}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Allergies or sensitivities
            </label>
            <Textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Anything your stylist should know?"
              rows={2}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Lifestyle notes
            </label>
            <Textarea
              value={lifestyleNotes}
              onChange={(e) => setLifestyleNotes(e.target.value)}
              placeholder="How much time do you spend on your hair daily?"
              rows={2}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              Maintenance level
            </label>
            <div className="flex gap-2">
              {["Low", "Medium", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setMaintenanceLevel(level.toLowerCase())}
                  className="flex-1 py-2.5 rounded-lg text-center transition-all"
                  style={{
                    fontSize: "13px",
                    fontFamily: "'DM Sans', sans-serif",
                    background: maintenanceLevel === level.toLowerCase()
                      ? "var(--brass)"
                      : "rgba(0,0,0,0.04)",
                    color: maintenanceLevel === level.toLowerCase()
                      ? "var(--bark-deepest)"
                      : "var(--text-on-stone-dim)",
                    border: maintenanceLevel === level.toLowerCase()
                      ? "1px solid var(--brass-warm)"
                      : "1px solid var(--stone-mid)",
                    cursor: "pointer",
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "4px", display: "block" }}>
              How often do you like to come in?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "4 weeks", value: "28" },
                { label: "6 weeks", value: "42" },
                { label: "8 weeks", value: "56" },
                { label: "As needed", value: "0" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisitCadence(opt.value)}
                  className="px-3 py-2 rounded-lg transition-all"
                  style={{
                    fontSize: "13px",
                    fontFamily: "'DM Sans', sans-serif",
                    background: visitCadence === opt.value
                      ? "var(--brass)"
                      : "rgba(0,0,0,0.04)",
                    color: visitCadence === opt.value
                      ? "var(--bark-deepest)"
                      : "var(--text-on-stone-dim)",
                    border: visitCadence === opt.value
                      ? "1px solid var(--brass-warm)"
                      : "1px solid var(--stone-mid)",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Stylist */}
      <Card>
        <CardContent className="py-4">
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-on-stone-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            My Stylist
          </p>
          <p style={{ fontSize: "15px", color: "var(--text-on-stone)", fontFamily: "'DM Sans', sans-serif" }}>
            {stylistName}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
            {workspaceName}
          </p>
          <p
            className="mt-3"
            style={{ fontSize: "12px", color: "var(--stone-shadow)", fontStyle: "italic" }}
          >
            Multi-stylist support coming soon
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="pb-4">
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
