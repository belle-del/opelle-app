"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { InviteModal } from "./InviteModal";

export function InviteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 14px", borderRadius: "6px",
          background: "#440606", border: "1px solid #5C0B0B",
          color: "#F1EFE0", fontSize: "11px", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
        }}
      >
        <UserPlus style={{ width: "14px", height: "14px" }} />
        Invite
      </button>
      <InviteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
