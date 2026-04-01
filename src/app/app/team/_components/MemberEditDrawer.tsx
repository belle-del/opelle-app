"use client";

import { useState } from "react";
import type { WorkspaceMember, PayType } from "@/lib/types";
import type { TeamRole, Permission } from "@/lib/permissions";
import { ALL_PERMISSIONS, getEffectivePermissions } from "@/lib/permissions";
import { RoleBadge } from "./RoleBadge";

const ROLES: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "instructor", label: "Instructor" },
  { value: "stylist", label: "Stylist" },
  { value: "student", label: "Student" },
  { value: "front_desk", label: "Front Desk" },
];

export function MemberEditDrawer({
  member,
  onClose,
  onUpdated,
  onDeactivated,
}: {
  member: WorkspaceMember;
  onClose: () => void;
  onUpdated: (m: WorkspaceMember) => void;
  onDeactivated: (id: string) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [displayName, setDisplayName] = useState(member.displayName || "");
  const [email, setEmail] = useState(member.email || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [payType, setPayType] = useState<PayType>(member.payType || "hourly");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePerms = getEffectivePermissions(role as TeamRole, member.permissions);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, displayName, email, phone, payType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Update failed"); return; }
      onUpdated(data.member);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate this team member?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
      if (res.ok) { onDeactivated(member.id); }
      else { const d = await res.json(); setError(d.error || "Failed"); }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: "400px", maxWidth: "100vw",
        background: "#1A1A14", zIndex: 101, overflowY: "auto",
        borderLeft: "1px solid rgba(196,171,112,0.15)", boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#F1EFE0", fontWeight: 300 }}>
            Edit Member
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(241,239,224,0.5)", cursor: "pointer", fontSize: "18px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: "6px", background: "rgba(196,122,122,0.15)", color: "#C47A7A", fontSize: "12px" }}>
            {error}
          </div>
        )}

        {/* Fields */}
        <Field label="Display Name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} style={inputStyle}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        <Field label="Pay Type">
          <select value={payType} onChange={(e) => setPayType(e.target.value as PayType)} style={inputStyle}>
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
            <option value="commission">Commission</option>
            <option value="booth_rent">Booth Rent</option>
          </select>
        </Field>

        {/* Effective permissions */}
        <div>
          <p style={{ fontSize: "10px", color: "rgba(196,171,112,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            Effective Permissions
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {ALL_PERMISSIONS.map((perm) => (
              <div key={perm} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 0", borderBottom: "1px solid rgba(241,239,224,0.04)",
              }}>
                <span style={{ fontSize: "11px", color: "rgba(241,239,224,0.6)", fontFamily: "monospace" }}>
                  {perm}
                </span>
                <span style={{ fontSize: "10px", color: effectivePerms[perm as Permission] ? "#7CB87A" : "rgba(241,239,224,0.2)" }}>
                  {effectivePerms[perm as Permission] ? "yes" : "\u2014"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "16px" }}>
          {member.status === "active" && member.role !== "owner" && (
            <button onClick={handleDeactivate} disabled={saving} style={{
              padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(196,122,122,0.3)",
              background: "rgba(196,122,122,0.08)", color: "#C47A7A", fontSize: "12px", cursor: "pointer",
            }}>
              Deactivate
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 20px", borderRadius: "6px", border: "none",
            background: "#440606", color: "#F1EFE0", fontSize: "12px", cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: "6px",
  border: "1px solid rgba(241,239,224,0.12)", fontSize: "13px",
  fontFamily: "'DM Sans', sans-serif", background: "rgba(241,239,224,0.06)",
  color: "#F1EFE0",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", color: "rgba(241,239,224,0.4)", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
