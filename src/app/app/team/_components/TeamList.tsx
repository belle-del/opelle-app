"use client";

import { useState } from "react";
import type { WorkspaceMember } from "@/lib/types";
import { RoleBadge } from "./RoleBadge";
import { MemberEditDrawer } from "./MemberEditDrawer";
import type { TeamRole } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";

export function TeamList({ members: initialMembers }: { members: WorkspaceMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);

  function handleUpdated(updated: WorkspaceMember) {
    setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    setEditingMember(null);
  }

  function handleDeactivated(id: string) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, status: "inactive" as const } : m));
    setEditingMember(null);
  }

  const active = members.filter((m) => m.status === "active");
  const inactive = members.filter((m) => m.status !== "active");

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {active.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4" style={{ cursor: "pointer" }} onClick={() => setEditingMember(member)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "rgba(68,6,6,0.08)", color: "#440606",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: 600, flexShrink: 0,
                }}>
                  {(member.displayName?.[0] || member.email?.[0] || "?").toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "#2C2C24", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {member.displayName || member.email || "Team Member"}
                  </p>
                  {member.email && (
                    <p style={{ fontSize: "11px", color: "#8A8778", fontFamily: "'DM Sans', sans-serif" }}>
                      {member.email}
                    </p>
                  )}
                </div>
                <RoleBadge role={member.role as TeamRole} />
              </div>
            </CardContent>
          </Card>
        ))}

        {inactive.length > 0 && (
          <>
            <p style={{ fontSize: "10px", color: "rgba(241,239,224,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "16px", marginBottom: "4px" }}>
              Inactive
            </p>
            {inactive.map((member) => (
              <Card key={member.id} style={{ opacity: 0.5 }}>
                <CardContent className="p-4" style={{ cursor: "pointer" }} onClick={() => setEditingMember(member)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "rgba(0,0,0,0.05)", color: "#8A8778",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", fontWeight: 600, flexShrink: 0,
                    }}>
                      {(member.displayName?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", color: "#8A8778", fontWeight: 500 }}>
                        {member.displayName || "Team Member"}
                      </p>
                    </div>
                    <RoleBadge role={member.role as TeamRole} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {editingMember && (
        <MemberEditDrawer
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdated={handleUpdated}
          onDeactivated={handleDeactivated}
        />
      )}
    </>
  );
}
