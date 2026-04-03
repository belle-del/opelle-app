"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, RotateCcw, History } from "lucide-react";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import type { StockMovement, StockMovementType } from "@/lib/types";

type ProductOption = { id: string; label: string };

const typeLabels: Record<string, { label: string; direction: "in" | "out" | "neutral" }> = {
  service_deduct: { label: "Service used", direction: "out" },
  manual_adjust: { label: "Manual count", direction: "neutral" },
  received: { label: "Received", direction: "in" },
  waste: { label: "Waste", direction: "out" },
  return: { label: "Return", direction: "in" },
};

const MOVEMENT_TYPES: { key: StockMovementType; label: string }[] = [
  { key: "service_deduct", label: "Service" },
  { key: "manual_adjust", label: "Manual" },
  { key: "received", label: "Received" },
  { key: "waste", label: "Waste" },
  { key: "return", label: "Return" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fetch product list for dropdown + name mapping
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts(
            data.products.map((p: { id: string; brand: string; shade: string }) => ({
              id: p.id,
              label: `${p.brand} ${p.shade}`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (selectedProduct) params.set("product_id", selectedProduct);
    if (selectedType) params.set("movement_type", selectedType);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    try {
      const res = await fetch(`/api/inventory/movements?${params}`);
      const data = await res.json();
      setMovements(data.movements ?? []);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, selectedType, startDate, endDate]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Build product name lookup
  const productNameMap: Record<string, string> = {};
  for (const p of products) {
    productNameMap[p.id] = p.label;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/app/products"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#6B5D4A" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div className="flex items-center gap-3">
          <History className="w-5 h-5" style={{ color: "var(--brass)" }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
            Movement History
          </h2>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date range */}
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />

        {/* Product + Type filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Product dropdown */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              maxWidth: "200px",
            }}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {/* Movement type pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedType("")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "10px",
                letterSpacing: "0.05em",
                border: "1px solid var(--stone-mid)",
                background: selectedType === "" ? "var(--stone-mid)" : "transparent",
                color: "var(--text-on-stone)",
                cursor: "pointer",
              }}
            >
              All Types
            </button>
            {MOVEMENT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                  border: "1px solid var(--stone-mid)",
                  background: selectedType === t.key ? "var(--stone-mid)" : "transparent",
                  color: "var(--text-on-stone)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
          Loading movements...
        </p>
      ) : movements.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", textAlign: "center", padding: "24px 0" }}>
          No movements found for the selected filters.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)" }}>
            {movements.length} movement{movements.length !== 1 ? "s" : ""}
          </p>
          {movements.map((m) => {
            const meta = typeLabels[m.movementType] ?? { label: m.movementType, direction: "neutral" as const };
            const isIn = meta.direction === "in" || m.quantityChange > 0;
            const isOut = meta.direction === "out" || m.quantityChange < 0;
            const pName = productNameMap[m.productId] || "Unknown product";

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
                    <p style={{ fontSize: "11px", color: "var(--text-on-stone)", fontWeight: 500 }}>
                      {pName}
                    </p>
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                      {meta.label}{m.notes ? ` — ${m.notes}` : ""}
                    </p>
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
      )}
    </div>
  );
}
