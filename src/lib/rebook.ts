import type { Appointment } from "@/lib/types";

export interface RebookStats {
  days_since_last_visit: number;
  avg_days_between_visits: number;
  urgency: "overdue" | "approaching" | "on_track";
  last_service_name: string;
  last_service_date: string;
}

export function computeRebookIntelligence(
  appointments: Appointment[]
): RebookStats | null {
  const completed = appointments
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
    );

  if (completed.length < 2) return null;

  const lastVisit = new Date(completed[0].startAt);
  const daysSince = Math.floor(
    (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
  );

  const gaps: number[] = [];
  for (let i = 0; i < completed.length - 1; i++) {
    const gap = Math.floor(
      (new Date(completed[i].startAt).getTime() -
        new Date(completed[i + 1].startAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (gap > 0) gaps.push(gap);
  }

  if (gaps.length === 0) return null;

  const avgDays = Math.round(
    gaps.reduce((s, g) => s + g, 0) / gaps.length
  );

  let urgency: RebookStats["urgency"] = "on_track";
  if (daysSince > avgDays * 1.2) urgency = "overdue";
  else if (daysSince > avgDays * 0.8) urgency = "approaching";

  return {
    days_since_last_visit: daysSince,
    avg_days_between_visits: avgDays,
    urgency,
    last_service_name: completed[0].serviceName,
    last_service_date: completed[0].startAt,
  };
}
