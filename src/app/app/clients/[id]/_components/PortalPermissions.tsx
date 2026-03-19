"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

type ClientPermissions = {
  can_self_book: boolean;
  can_message: boolean;
  can_upload_inspo: boolean;
  can_view_formulas: boolean;
};

const PERMISSION_LABELS: Record<keyof ClientPermissions, { label: string; description: string }> = {
  can_self_book: { label: "Self-booking", description: "Client can book appointments directly" },
  can_message: { label: "Messaging", description: "Client can send messages" },
  can_upload_inspo: { label: "Inspo uploads", description: "Client can upload inspiration photos" },
  can_view_formulas: { label: "Formula history", description: "Client can view their formula history" },
};

interface Props {
  clientId: string;
  initialPermissions: ClientPermissions;
}

export function PortalPermissions({ clientId, initialPermissions }: Props) {
  const [permissions, setPermissions] = useState<ClientPermissions>(initialPermissions);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(key: keyof ClientPermissions) {
    const newValue = !permissions[key];
    const updated = { ...permissions, [key]: newValue };

    // Optimistic update
    setPermissions(updated);
    setSaving(key);

    try {
      const res = await fetch(`/api/clients/${clientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setPermissions(permissions);
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: "14px" }}>
          <Shield className="w-4 h-4" />
          Portal Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(PERMISSION_LABELS) as Array<keyof ClientPermissions>).map((key) => (
          <div
            key={key}
            className="flex items-center justify-between"
            style={{ padding: "4px 0" }}
          >
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                {PERMISSION_LABELS[key].label}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>
                {PERMISSION_LABELS[key].description}
              </p>
            </div>
            <button
              onClick={() => toggle(key)}
              disabled={saving === key}
              style={{
                width: "40px",
                height: "22px",
                borderRadius: "11px",
                border: "none",
                background: permissions[key]
                  ? "var(--status-confirmed, #4A7C59)"
                  : "var(--stone-warm, #D4C9B5)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: saving === key ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: "2px",
                  left: permissions[key] ? "20px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
