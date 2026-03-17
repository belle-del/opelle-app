"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import MentisChat from "@/app/app/mentis/_components/MentisChat";

export default function MentisFloatingChat() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Build context from pathname
  const context: { page: string; clientId?: string } = { page: pathname };
  if (pathname.includes("/clients/")) {
    const match = pathname.match(/\/clients\/([^/]+)/);
    if (match) context.clientId = match[1];
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Don't render on the full Mentis page (must be after all hooks)
  if (pathname === "/app/mentis") return null;

  return (
    <>
      {/* Slide-up Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          bottom: "90px",
          right: "24px",
          width: "400px",
          height: "520px",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "70vh",
          background: "#FAFAF5",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(20px)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #6B2737, #440606)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} color="#fff" />
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "16px",
              fontWeight: 400,
              color: "#fff",
              flex: 1,
            }}
          >
            Mentis
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close Mentis chat"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X size={18} color="#fff" />
          </button>
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {open && <MentisChat fullPage={false} context={context} />}
        </div>
      </div>

      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open Mentis chat"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #6B2737, #440606)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          boxShadow: hovered
            ? "0 0 20px rgba(68, 6, 6, 0.4)"
            : "0 4px 12px rgba(0,0,0,0.15)",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <Sparkles size={24} />
      </button>
    </>
  );
}
