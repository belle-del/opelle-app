"use client";

interface Column {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

interface ReportTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  keyField?: string;
}

export function ReportTable({ columns, data, keyField }: ReportTableProps) {
  if (data.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "20px", color: "var(--text-on-stone-faint)", fontSize: "11px" }}>
        No data available
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--stone-mid)",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-on-stone-faint)",
                  fontWeight: 500,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={keyField ? String(row[keyField]) : i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "7px 10px",
                    borderBottom: "1px solid var(--stone-mid)",
                    color: "var(--text-on-stone)",
                  }}
                >
                  {col.format ? col.format(row[col.key]) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
