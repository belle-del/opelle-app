interface SummaryBarProps {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValueCents: number;
}

export function InventorySummaryBar({
  totalProducts,
  lowStockCount,
  outOfStockCount,
  totalValueCents,
}: SummaryBarProps) {
  const totalValue = (totalValueCents / 100).toFixed(2);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "12px",
      marginBottom: "24px",
    }}>
      {[
        { label: "Total Products", value: totalProducts, color: "var(--text-on-stone)" },
        {
          label: "Low Stock",
          value: lowStockCount,
          color: lowStockCount > 0 ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
        },
        {
          label: "Out of Stock",
          value: outOfStockCount,
          color: outOfStockCount > 0 ? "var(--color-garnet, #8B3A3A)" : "var(--text-on-stone)",
        },
        { label: "Inventory Value", value: `$${totalValue}`, color: "var(--brass, #C4AB70)" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: "var(--card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
            borderRadius: "10px",
            padding: "14px 16px",
          }}
        >
          <p style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", marginBottom: "6px" }}>
            {label}
          </p>
          <p style={{ fontSize: "22px", fontFamily: "'Fraunces', serif", fontWeight: 300, color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
