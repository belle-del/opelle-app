"use client";

export function LocalTime({ iso, format = "time" }: { iso: string; format?: "time" | "datetime" | "date" }) {
  const d = new Date(iso);
  if (format === "time") return <>{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>;
  if (format === "date") return <>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>;
  return <>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>;
}
