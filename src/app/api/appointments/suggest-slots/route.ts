import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TimeOfDay = "morning" | "afternoon" | "evening";
type Timeframe = "1_week" | "2_weeks" | "1_month";

type SuggestedSlot = {
  date: string;
  startTime: string;
  endTime: string;
  dayName: string;
  score: number;
};

type WorkingHours = Record<string, { open: string; close: string } | null>;

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: "09:00", close: "17:00" },
  tuesday: { open: "09:00", close: "17:00" },
  wednesday: { open: "09:00", close: "17:00" },
  thursday: { open: "09:00", close: "17:00" },
  friday: { open: "09:00", close: "17:00" },
  saturday: null,
  sunday: null,
};

const TIME_RANGES: Record<TimeOfDay, { start: number; end: number }> = {
  morning: { start: 9, end: 12 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 17, end: 20 },
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getTimeframeDays(timeframe: Timeframe): number {
  switch (timeframe) {
    case "1_week": return 7;
    case "2_weeks": return 14;
    case "1_month": return 30;
    default: return 14;
  }
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      preferredDays = [],
      preferredTime = "morning",
      timeframe = "2_weeks",
      durationMins = 60,
    } = body as {
      workspaceId: string;
      preferredDays: string[];
      preferredTime: TimeOfDay;
      timeframe: Timeframe;
      durationMins: number;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Get workspace working hours
    const { data: workspace } = await admin
      .from("workspaces")
      .select("working_hours")
      .eq("id", workspaceId)
      .single();

    const workingHours: WorkingHours =
      (workspace?.working_hours as WorkingHours) || DEFAULT_WORKING_HOURS;

    // Get existing appointments in the timeframe window
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + getTimeframeDays(timeframe));

    const { data: existingAppointments } = await admin
      .from("appointments")
      .select("start_at, duration_mins")
      .eq("workspace_id", workspaceId)
      .in("status", ["scheduled"])
      .gte("start_at", startDate.toISOString())
      .lte("start_at", endDate.toISOString());

    // Build a set of busy periods (start minute, end minute) per date string
    const busyByDate = new Map<string, Array<{ start: number; end: number }>>();
    for (const appt of existingAppointments || []) {
      const d = new Date(appt.start_at);
      const dateKey = d.toISOString().split("T")[0];
      const startMin = d.getHours() * 60 + d.getMinutes();
      const endMin = startMin + (appt.duration_mins || 60) + 15; // 15 min buffer
      if (!busyByDate.has(dateKey)) busyByDate.set(dateKey, []);
      busyByDate.get(dateKey)!.push({ start: startMin, end: endMin });
    }

    // Normalize preferred days to lowercase
    const normalizedPreferredDays = preferredDays.map((d: string) => d.toLowerCase());
    const timeRange = TIME_RANGES[preferredTime] || TIME_RANGES.morning;

    const slots: SuggestedSlot[] = [];

    // Iterate each day in the timeframe
    const cursor = new Date(startDate);
    while (cursor <= endDate && slots.length < 12) {
      const dayName = DAY_NAMES[cursor.getDay()];
      const dateKey = cursor.toISOString().split("T")[0];
      const hours = workingHours[dayName];

      // Skip days where the workspace is closed
      if (hours) {
        const workStart = parseTime(hours.open);
        const workEnd = parseTime(hours.close);

        // Determine the scan window: intersection of working hours and preferred time
        const scanStart = Math.max(workStart, timeRange.start * 60);
        const scanEnd = Math.min(workEnd, timeRange.end * 60);

        if (scanEnd - scanStart >= durationMins) {
          const busy = busyByDate.get(dateKey) || [];

          // Try slots every 30 minutes within the scan window
          for (let t = scanStart; t + durationMins <= scanEnd; t += 30) {
            const slotEnd = t + durationMins;
            const hasConflict = busy.some(
              (b) => t < b.end && slotEnd > b.start
            );

            if (!hasConflict) {
              // Score: preferred day match gets +50, earlier in timeframe gets slight bonus
              const dayMatch = normalizedPreferredDays.length === 0 ||
                normalizedPreferredDays.includes(dayName);
              const daysFromNow = Math.floor(
                (cursor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              const score = (dayMatch ? 50 : 0) + Math.max(0, 30 - daysFromNow);

              slots.push({
                date: dateKey,
                startTime: formatTime(t),
                endTime: formatTime(slotEnd),
                dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                score,
              });
            }
          }
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // Sort by score descending, take top 6
    slots.sort((a, b) => b.score - a.score);
    const topSlots = slots.slice(0, 6);

    // Re-sort the final 6 by date for display
    topSlots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ slots: topSlots });
  } catch (error) {
    console.error("[suggest-slots] Error:", error);
    return NextResponse.json({ error: "Failed to suggest slots" }, { status: 500 });
  }
}
