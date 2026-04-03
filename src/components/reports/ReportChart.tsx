"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ReportChartProps {
  type: "line" | "bar";
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: { key: string; color: string; name: string }[];
  height?: number;
}

export function ReportChart({ type, data, xKey, yKeys, height = 250 }: ReportChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: "var(--text-on-stone-faint)", fontSize: "11px" }}>
        No data for this period
      </div>
    );
  }

  const Chart = type === "line" ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--stone-mid)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 9, fill: "var(--text-on-stone-faint)" }}
          tickFormatter={(v: string) => v.length > 7 ? v.slice(5) : v}
        />
        <YAxis tick={{ fontSize: 9, fill: "var(--text-on-stone-faint)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--stone-card)",
            border: "1px solid var(--stone-mid)",
            borderRadius: "6px",
            fontSize: "10px",
            color: "var(--text-on-stone)",
          }}
        />
        {yKeys.map((yk) =>
          type === "line" ? (
            <Line key={yk.key} type="monotone" dataKey={yk.key} stroke={yk.color} name={yk.name} strokeWidth={2} dot={false} />
          ) : (
            <Bar key={yk.key} dataKey={yk.key} fill={yk.color} name={yk.name} radius={[3, 3, 0, 0]} />
          )
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
