import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toLocalISOString, toLocalDateString } from "@/lib/utils";

type WorkingHoursDay = { start: string; end: string; closed: boolean };
type WorkingHours = Record<string, WorkingHoursDay>;

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  const admin = createSupabaseAdminClient();

  // Try cookie auth first, fall back to query param
  let clientUser: { workspace_id: string; client_id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: cu } = await admin
        .from("client_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .limit(1)
        .single();
      clientUser = cu;
    }
  } catch {}

  // Fallback: accept workspaceId from query params (page is middleware-protected)
  if (!clientUser) {
    const workspaceId = searchParams.get("workspaceId");
    const clientId = searchParams.get("clientId");
    if (workspaceId && clientId) {
      clientUser = { workspace_id: workspaceId, client_id: clientId };
    }
  }

  // Third fallback: look up workspace from service type (page is middleware-protected)
  if (!clientUser && serviceId) {
    const { data: st } = await admin.from("service_types").select("workspace_id").eq("id", serviceId).single();
    if (st) {
      clientUser = { workspace_id: st.workspace_id, client_id: "anonymous" };
    }
  }

  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get workspace settings
  const { data: workspace } = await admin
    .from("workspaces")
    .select("working_hours, buffer_minutes, booking_window_days, allow_individual_availability")
    .eq("id", clientUser.workspace_id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Get service duration
  let durationMins = 60;
  if (serviceId) {
    const { data: service } = await admin
      .from("service_types")
      .select("duration_minutes")
      .eq("id", serviceId)
      .single();
    if (service?.duration_minutes) {
      durationMins = service.duration_minutes;
    }
  }

  // Default working hours: Mon-Sat 9am-6pm, Sun closed
  const DEFAULT_HOURS: WorkingHours = {
    sunday: { start: "09:00", end: "17:00", closed: true },
    monday: { start: "09:00", end: "18:00", closed: false },
    tuesday: { start: "09:00", end: "18:00", closed: false },
    wednesday: { start: "09:00", end: "18:00", closed: false },
    thursday: { start: "09:00", end: "18:00", closed: false },
    friday: { start: "09:00", end: "18:00", closed: false },
    saturday: { start: "09:00", end: "17:00", closed: false },
  };
  const rawHours: WorkingHours = workspace.working_hours && Object.keys(workspace.working_hours).length > 0
    ? workspace.working_hours
    : DEFAULT_HOURS;
  const workingHours: WorkingHours = rawHours;
  const bufferMinutes = workspace.buffer_minutes || 0;
  const bookingWindowDays = workspace.booking_window_days || 60;

  const stylistId = searchParams.get("stylist_id");
  const allowIndividual = (workspace as Record<string, unknown>).allow_individual_availability as boolean | null;

  // If individual availability is enabled and a stylist is specified, check their patterns
  let effectiveHours: WorkingHours = workingHours;

  // Generate slots for the requested date or the next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingWindowDays);

  let dates: Date[];
  if (dateStr) {
    const requestedDate = new Date(dateStr + "T00:00:00");
    dates = [requestedDate];
  } else {
    // Return next 7 days
    dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (d <= maxDate) dates.push(d);
    }
  }

  if (allowIndividual && stylistId) {
    // Get today's date string for effective pattern lookup
    const todayStr = toLocalDateString(today);

    const { data: patterns } = await admin
      .from("availability_patterns")
      .select("day_of_week, start_time, end_time")
      .eq("workspace_id", clientUser.workspace_id)
      .eq("user_id", stylistId)
      .lte("effective_from", todayStr)
      .or(`effective_to.is.null,effective_to.gte.${todayStr}`);

    if (patterns && patterns.length > 0) {
      // Build WorkingHours-shaped object from stylist patterns
      const stylistHours: WorkingHours = {};
      for (const p of patterns) {
        const dayName = DAY_NAMES[p.day_of_week as number];
        stylistHours[dayName] = {
          start: (p.start_time as string).slice(0, 5),
          end: (p.end_time as string).slice(0, 5),
          closed: false,
        };
      }
      // Fill remaining days as closed
      for (const day of DAY_NAMES) {
        if (!stylistHours[day]) {
          stylistHours[day] = { start: "09:00", end: "18:00", closed: true };
        }
      }
      effectiveHours = stylistHours;
    }
  }

  // Get existing appointments in the date range
  const startRange = dates[0] ? toLocalISOString(dates[0]) : undefined;
  const endDate = new Date(dates[dates.length - 1] || today);
  endDate.setDate(endDate.getDate() + 1);
  const endRange = toLocalISOString(endDate);

  const { data: existingAppointments } = await admin
    .from("appointments")
    .select("start_at, duration_mins")
    .eq("workspace_id", clientUser.workspace_id)
    .in("status", ["scheduled", "pending_confirmation"])
    .gte("start_at", startRange)
    .lt("start_at", endRange);

  // Build occupied intervals (in minutes from midnight for each date)
  const occupiedByDate: Record<string, Array<{ start: number; end: number }>> = {};
  for (const appt of existingAppointments || []) {
    const apptStart = new Date(appt.start_at);
    const dateKey = toLocalDateString(apptStart);
    const startMin = apptStart.getHours() * 60 + apptStart.getMinutes();
    const endMin = startMin + (appt.duration_mins || 60) + bufferMinutes;

    if (!occupiedByDate[dateKey]) occupiedByDate[dateKey] = [];
    occupiedByDate[dateKey].push({ start: startMin, end: endMin });
  }

  // Generate available slots
  const allSlots: Array<{
    date: string;
    time: string;
    startAt: string;
    available: boolean;
  }> = [];

  // Fetch overrides for stylist if applicable
  const overridesByDate: Record<string, { is_available: boolean; start_time: string | null; end_time: string | null }> = {};
  if (allowIndividual && stylistId) {
    const startRange2 = toLocalDateString(dates[0] || today);
    const endRange2 = toLocalDateString(dates[dates.length - 1] || today);
    const { data: overrideRows } = await admin
      .from("availability_overrides")
      .select("override_date, is_available, start_time, end_time")
      .eq("workspace_id", clientUser.workspace_id)
      .eq("user_id", stylistId)
      .gte("override_date", startRange2)
      .lte("override_date", endRange2);

    for (const ov of overrideRows || []) {
      overridesByDate[ov.override_date as string] = ov as { is_available: boolean; start_time: string | null; end_time: string | null };
    }
  }

  for (const date of dates) {
    const dayName = DAY_NAMES[date.getDay()];
    const dateKey = toLocalDateString(date);

    // Check for a date-specific override
    const override = overridesByDate[dateKey];
    let dayHours: WorkingHours[string];

    if (override) {
      if (!override.is_available) continue; // blocked day
      dayHours = {
        start: override.start_time?.slice(0, 5) ?? "09:00",
        end: override.end_time?.slice(0, 5) ?? "18:00",
        closed: false,
      };
    } else {
      dayHours = effectiveHours[dayName];
    }

    if (!dayHours || dayHours.closed) continue;

    const openMin = timeToMinutes(dayHours.start);
    const closeMin = timeToMinutes(dayHours.end);
    const occupied = occupiedByDate[dateKey] || [];

    // Generate 30-min increment slots
    for (let slotStart = openMin; slotStart + durationMins <= closeMin; slotStart += 30) {
      const slotEnd = slotStart + durationMins;

      // Check if slot overlaps with any occupied interval
      const isOccupied = occupied.some(
        o => slotStart < o.end && slotEnd > o.start
      );

      // Check if slot is in the past
      const now = new Date();
      const slotDateTime = new Date(dateKey + "T" + minutesToTime(slotStart) + ":00");
      const isPast = slotDateTime <= now;

      if (!isOccupied && !isPast) {
        allSlots.push({
          date: dateKey,
          time: minutesToTime(slotStart),
          startAt: toLocalISOString(slotDateTime),
          available: true,
        });
      }
    }
  }

  return NextResponse.json({
    slots: allSlots,
    durationMins,
    bookingWindowDays,
  });
}
