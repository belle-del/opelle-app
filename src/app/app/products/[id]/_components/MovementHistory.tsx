import type { StockMovement } from "@/lib/types";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";

interface MovementHistoryProps {
  movements: StockMovement[];
}

const typeLabels: Record<string, { label: string; direction: "in" | "out" | "neutral" }> = {
  service_deduct: { label: "Service used", direction: "out" },
  manual_adjust: { label: "Manual count", direction: "neutral" },
  received: { label: "Received", direction: "in" },
  waste: { label: "Waste", direction: "out" },
  return: { label: "Return", direction: "in" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MovementHistory({ movements }: MovementHistoryProps) {
  if (movements.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
        No stock movements yet
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {movements.map((m) => {
        const meta = typeLabels[m.movementType] ?? { label: m.movementType, direction: "neutral" as const };
        const isIn = meta.direction === "in" || m.quantityChange > 0;
        const isOut = meta.direction === "out" || m.quantityChange < 0;

        return (
          <div
            key={m.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: isIn ? "rgba(74,124,89,0.15)" : isOut ? "rgba(139,58,58,0.15)" : "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isIn
                  ? <ArrowUp className="w-3.5 h-3.5" style={{ color: "#4A7C59" }} />
                  : isOut
                  ? <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--color-garnet, #8B3A3A)" }} />
                  : <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--text-on-stone-faint)" }} />
                }
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>{meta.label}</p>
                {m.notes && (
                  <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{m.notes}</p>
                )}
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{formatDate(m.createdAt)}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: "13px", fontFamily: "'Fraunces', serif",
                color: isIn ? "#4A7C59" : isOut ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
              }}>
                {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
              </p>
              <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                {m.previousStock} → {m.newStock}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
