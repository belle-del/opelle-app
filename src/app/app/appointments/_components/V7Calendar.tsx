"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DRAG_TYPE = "APPOINTMENT";

type View = "day" | "week" | "month";

interface Appointment {
  id: string;
  startAt: string;
  clientId: string;
  serviceName: string;
  status: string;
  durationMins: number;
}

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
}

interface V7CalendarProps {
  appointments: Appointment[];
  clients: Client[];
  workingHours?: Record<string, { start: string; end: string; closed: boolean }>;
  onReschedule?: (appointmentId: string, newStartAt: string) => void;
}

// Draggable appointment block
function DraggableAppt({ appt, children }: { appt: Appointment; children: React.ReactNode }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DRAG_TYPE,
    item: { id: appt.id, durationMins: appt.durationMins },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const ref = useRef<HTMLDivElement>(null);
  dragRef(ref);
  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1, cursor: "grab" }}>
      {children}
    </div>
  );
}

// Droppable time slot
function DroppableSlot({
  date,
  hour,
  isClosed,
  onDrop,
  children,
  style,
  onClick,
  title,
}: {
  date: Date;
  hour: number;
  isClosed: boolean;
  onDrop: (id: string, newStart: string) => void;
  children: React.ReactNode;
  style: React.CSSProperties;
  onClick?: () => void;
  title?: string;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DRAG_TYPE,
    canDrop: () => !isClosed,
    drop: (item: { id: string }) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const newStart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00:00`;
      onDrop(item.id, newStart);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  const ref = useRef<HTMLDivElement>(null);
  dropRef(ref);
  return (
    <div
      ref={ref}
      onClick={onClick}
      title={title}
      style={{
        ...style,
        background: isOver && canDrop
          ? "rgba(196,171,112,0.15)"
          : style.background,
        outline: isOver && canDrop ? "2px solid var(--brass, #C4AB70)" : undefined,
        outlineOffset: "-2px",
      }}
      onMouseEnter={(e) => {
        if (!isOver && !isClosed && !children) e.currentTarget.style.background = "rgba(143,173,200,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!isOver) e.currentTarget.style.background = isClosed ? "rgba(0,0,0,0.08)" : "transparent";
      }}
    >
      {children}
    </div>
  );
}

function getClientName(clients: Client[], id: string) {
  const c = clients.find((cl) => cl.id === id);
  if (!c) return "Unknown";
  return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 8 AM to 8 PM
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
// Default working hours (Mon-Sat 9-6, Sun closed) — used for greying out closed hours
const DEFAULT_WORKING: Record<number, { open: number; close: number } | null> = {
  0: null, // Sunday closed
  1: { open: 9, close: 18 },
  2: { open: 9, close: 18 },
  3: { open: 9, close: 18 },
  4: { open: 9, close: 18 },
  5: { open: 9, close: 18 },
  6: { open: 9, close: 17 }, // Saturday
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function statusBg(status: string) {
  if (status === "completed") return "var(--blue, #8FADC8)";
  if (status === "cancelled") return "var(--status-low)";
  if (status === "pending_confirmation") return "var(--brass, #C4AB70)";
  return "var(--garnet-vivid)"; // scheduled = confirmed
}

function statusText(status: string) {
  if (status === "completed") return "#FFFFFF";
  if (status === "cancelled") return "#FFFFFF";
  if (status === "pending_confirmation") return "#2C2C24";
  return "#FAF8F3";
}

function formatHour(h: number) {
  if (h === 0) return "12AM";
  if (h === 12) return "12PM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

function getSavedView(): View {
  if (typeof window === "undefined") return "week";
  const saved = localStorage.getItem("opelle-calendar-view");
  if (saved === "day" || saved === "week" || saved === "month") return saved;
  return "week";
}

function getSavedDate(): Date {
  // Always start on today — saved dates cause stale calendar views
  return new Date();
}

function makeNewApptUrl(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `/app/appointments/new?startAt=${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function V7Calendar({ appointments: initialAppointments, clients, workingHours, onReschedule }: V7CalendarProps) {
  const [appointments, setAppointments] = useState(initialAppointments);

  // Sync when props change (e.g., server revalidation)
  useEffect(() => { setAppointments(initialAppointments); }, [initialAppointments]);

  const handleDrop = useCallback(
    async (appointmentId: string, newStartAt: string) => {
      // Optimistic update
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, startAt: newStartAt } : a))
      );

      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startAt: newStartAt }),
        });
        if (!res.ok) throw new Error("Failed to reschedule");
        onReschedule?.(appointmentId, newStartAt);
      } catch {
        // Revert on failure
        setAppointments(initialAppointments);
      }
    },
    [onReschedule, initialAppointments]
  );
  // Build working hours lookup from workspace settings (or use defaults)
  const DAY_NAME_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const resolvedWorking: Record<number, { open: number; close: number } | null> = {};
  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAME_MAP[i];
    const wh = workingHours?.[dayName];
    if (!wh || wh.closed) {
      resolvedWorking[i] = DEFAULT_WORKING[i]; // fall back to default if no settings
      if (wh?.closed) resolvedWorking[i] = null; // explicitly closed overrides default
    } else {
      const [oh] = wh.start.split(":").map(Number);
      const [ch] = wh.end.split(":").map(Number);
      resolvedWorking[i] = { open: oh, close: ch };
    }
  }
  // If workspace has ANY working hours set, don't use defaults for unset days
  const hasSettings = workingHours && Object.keys(workingHours).length > 0;
  if (hasSettings) {
    for (let i = 0; i < 7; i++) {
      const dayName = DAY_NAME_MAP[i];
      if (!workingHours[dayName]) resolvedWorking[i] = null; // unset = closed
    }
  }
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [current, setCurrent] = useState<Date>(new Date());
  const [hydrated, setHydrated] = useState(false);
  const today = new Date();

  // Apply localStorage values after hydration to avoid SSR mismatch
  useEffect(() => {
    setView(getSavedView());
    setHydrated(true);
    console.log("[V7Calendar] hydrated, appointments:", appointments.length, "clients:", clients.length);
  }, []);

  // Persist view and date to localStorage
  const updateView = (v: View) => {
    setView(v);
    localStorage.setItem("opelle-calendar-view", v);
  };

  const updateCurrent = (d: Date) => {
    setCurrent(d);
    localStorage.setItem("opelle-calendar-date", d.toISOString());
  };

  const navigate = (dir: -1 | 1) => {
    const d = new Date(current);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    updateCurrent(d);
  };

  const headerLabel = () => {
    if (view === "day") return `${DAY_NAMES[current.getDay()]}, ${MONTH_NAMES[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}\u2013${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} \u2013 ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
  };

  const DayView = () => {
    const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), current));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr" }}>
        {HOURS.map((hour) => {
          const slotAppts = dayAppts.filter((a) => new Date(a.startAt).getHours() === hour);
          const dayWork = resolvedWorking[current.getDay()];
          const isClosed = !dayWork || hour < dayWork.open || hour >= dayWork.close;
          return (
            <div key={hour} style={{ display: "contents" }}>
              <div style={{ padding: "10px 8px 8px 0", textAlign: "right", fontSize: "9px", color: isClosed ? "var(--text-on-stone-ghost)" : "var(--text-on-stone-faint)" }}>
                {formatHour(hour)}
              </div>
              <div
                onClick={() => { if (slotAppts.length === 0 && !isClosed) router.push(makeNewApptUrl(current, hour)); }}
                style={{ borderTop: "1px solid var(--stone-mid)", padding: "4px 0 4px 8px", minHeight: "52px", cursor: slotAppts.length === 0 && !isClosed ? "pointer" : "default", transition: "background 0.15s", position: "relative", background: isClosed ? "rgba(0,0,0,0.08)" : "transparent" }}
                onMouseEnter={(e) => { if (slotAppts.length === 0 && !isClosed) e.currentTarget.style.background = "rgba(143,173,200,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isClosed ? "rgba(0,0,0,0.08)" : "transparent"; }}
                title={slotAppts.length === 0 && !isClosed ? "Click to add appointment" : isClosed ? "Outside working hours" : undefined}
              >
                {slotAppts.map((appt) => {
                  const durationHours = (appt.durationMins || 60) / 60;
                  const spanHeight = Math.max(1, durationHours) * 52;
                  const startMin = new Date(appt.startAt).getMinutes();
                  const topOffset = (startMin / 60) * 52;
                  return (
                    <Link key={appt.id} href={`/app/appointments/${appt.id}`} style={{ display: "block", position: "absolute", top: `${topOffset}px`, left: "8px", right: "8px", zIndex: 2 }}>
                      <div style={{ padding: "8px 12px", borderRadius: "6px", background: statusBg(appt.status), height: `${spanHeight - 4}px`, display: "flex", flexDirection: "column", justifyContent: "flex-start", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: statusText(appt.status) }}>{getClientName(clients, appt.clientId)}</p>
                        <p style={{ fontSize: "10px", color: statusText(appt.status), opacity: 0.8 }}>{appt.serviceName}</p>
                        <p style={{ fontSize: "10px", color: statusText(appt.status), opacity: 0.7, marginTop: "auto" }}>{(appt.durationMins || 60)} min</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const WeekView = () => {
    const ws = startOfWeek(current);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", marginBottom: "4px" }}>
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <button key={day.toISOString()} onClick={() => { updateCurrent(day); updateView("day"); }}
                style={{ textAlign: "center", padding: "6px 2px", borderRadius: "6px", background: isToday ? "var(--garnet-wash)" : "transparent", border: "none" }}>
                <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{DAY_NAMES[day.getDay()]}</p>
                <p style={{ fontSize: "16px", fontFamily: "'Fraunces', serif", color: isToday ? "var(--garnet-ruby)" : "var(--text-on-stone)", fontWeight: 300 }}>{day.getDate()}</p>
              </button>
            );
          })}
        </div>
        {HOURS.map((hour) => (
          <div key={hour} style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", textAlign: "right", paddingRight: "8px", paddingTop: "8px" }}>{formatHour(hour)}</div>
            {days.map((day) => {
              const slotAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day) && new Date(a.startAt).getHours() === hour);
              const dayWork = resolvedWorking[day.getDay()];
              const isClosed = !dayWork || hour < dayWork.open || hour >= dayWork.close;
              return (
                <DroppableSlot
                  key={day.toISOString()}
                  date={day}
                  hour={hour}
                  isClosed={isClosed}
                  onDrop={handleDrop}
                  onClick={() => { if (slotAppts.length === 0 && !isClosed) router.push(makeNewApptUrl(day, hour)); }}
                  title={slotAppts.length === 0 ? "Click to add appointment" : undefined}
                  style={{ borderTop: "1px solid var(--stone-mid)", borderLeft: "1px solid var(--stone-mid)", padding: "3px", minHeight: "44px", cursor: slotAppts.length === 0 && !isClosed ? "pointer" : "default", transition: "background 0.15s", position: "relative", background: isClosed ? "rgba(0,0,0,0.08)" : "transparent" }}
                >
                  {slotAppts.map((appt) => {
                    const durationHours = (appt.durationMins || 60) / 60;
                    const spanHeight = Math.max(1, durationHours) * 44;
                    const startMin = new Date(appt.startAt).getMinutes();
                    const topOffset = (startMin / 60) * 44;
                    return (
                      <DraggableAppt key={appt.id} appt={appt}>
                        <Link href={`/app/appointments/${appt.id}`} style={{ display: "block", position: "absolute", top: `${topOffset}px`, left: "3px", right: "3px", zIndex: 2 }}>
                          <div style={{ padding: "4px 6px", borderRadius: "4px", background: statusBg(appt.status), height: `${spanHeight - 4}px`, display: "flex", flexDirection: "column", justifyContent: "flex-start", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <p style={{ fontSize: "10px", fontWeight: 600, color: statusText(appt.status), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getClientName(clients, appt.clientId)}</p>
                            <p style={{ fontSize: "8px", color: statusText(appt.status), opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.serviceName}</p>
                            <p style={{ fontSize: "8px", color: statusText(appt.status), opacity: 0.7, marginTop: "auto" }}>{(appt.durationMins || 60)} min</p>
                          </div>
                        </Link>
                      </DraggableAppt>
                    );
                  })}
                </DroppableSlot>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const MonthView = () => {
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const startPad = firstDay.getDay();
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    const cells = Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(firstDay);
      d.setDate(1 - startPad + i);
      return d;
    });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "9px", color: "var(--text-on-stone-faint)", padding: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
          {cells.map((day, i) => {
            const inMonth = day.getMonth() === current.getMonth();
            const isToday = isSameDay(day, today);
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day));
            return (
              <button key={i} onClick={() => { updateCurrent(day); updateView("day"); }}
                style={{ minHeight: "72px", padding: "4px 6px", textAlign: "left", borderRadius: "6px", background: isToday ? "var(--garnet-wash)" : "transparent", border: "1px solid var(--stone-mid)", opacity: inMonth ? 1 : 0.35 }}>
                <p style={{ fontSize: "11px", fontFamily: "'Fraunces', serif", color: isToday ? "var(--garnet-ruby)" : "var(--text-on-stone)", fontWeight: 300 }}>{day.getDate()}</p>
                <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginTop: "4px" }}>
                  {dayAppts.slice(0, 3).map((a) => (
                    <div key={a.id} style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusBg(a.status) }} />
                  ))}
                  {dayAppts.length > 3 && <span style={{ fontSize: "8px", color: "var(--text-on-stone-faint)" }}>+{dayAppts.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const btnBase: React.CSSProperties = { borderRadius: "6px", background: "var(--stone-mid)", border: "1px solid var(--stone-warm)", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button onClick={() => navigate(-1)} style={{ ...btnBase, width: "28px", height: "28px" }}><ChevronLeft size={14} style={{ color: "var(--text-on-stone)" }} /></button>
            <button onClick={() => navigate(1)} style={{ ...btnBase, width: "28px", height: "28px" }}><ChevronRight size={14} style={{ color: "var(--text-on-stone)" }} /></button>
            <button onClick={() => updateCurrent(new Date())} style={{ ...btnBase, padding: "4px 10px", fontSize: "10px", color: "var(--text-on-stone)" }}>Today</button>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: "16px", color: "var(--text-on-stone)", fontWeight: 300, marginLeft: "4px" }}>{headerLabel()}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", background: "var(--stone-mid)", borderRadius: "100px", padding: "2px", border: "1px solid var(--stone-warm)" }}>
              {(["day", "week", "month"] as View[]).map((v) => (
                <button key={v} onClick={() => updateView(v)}
                  style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", background: view === v ? "var(--garnet)" : "transparent", color: view === v ? "var(--stone-lightest)" : "var(--text-on-stone)", border: "none", textTransform: "capitalize" }}>
                  {v}
                </button>
              ))}
            </div>
            <Link href="/app/appointments/new">
              <button style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--garnet)", border: "1px solid var(--garnet-vivid)", color: "var(--stone-lightest)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={11} /> New Appointment
              </button>
            </Link>
          </div>
        </div>

        <div style={{ background: "var(--stone-card)", borderRadius: "8px", padding: "12px", boxShadow: "0 3px 14px rgba(0,0,0,0.16)" }}>
          {view === "day" && <DayView />}
          {view === "week" && <WeekView />}
          {view === "month" && <MonthView />}
        </div>
      </div>
    </DndProvider>
  );
}
