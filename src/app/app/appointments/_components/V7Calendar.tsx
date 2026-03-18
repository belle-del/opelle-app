"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type View = "day" | "week" | "month";

interface Appointment {
  id: string;
  startAt: string;
  clientId: string;
  serviceName: string;
  status: string;
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

// Show 6 AM to 9 PM to cover most salon hours across timezones
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function statusColor(status: string) {
  if (status === "completed") return "var(--status-confirmed)";
  if (status === "cancelled") return "var(--status-low)";
  return "var(--garnet-vivid)";
}

function formatHour(h: number) {
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
  return `/app/appointments/new?startAt=${d.toISOString().slice(0, 16)}`;
}

export function V7Calendar({ appointments, clients }: V7CalendarProps) {
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
          return (
            <div key={hour} style={{ display: "contents" }}>
              <div style={{ padding: "10px 8px 8px 0", textAlign: "right", fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                {formatHour(hour)}
              </div>
              <div
                onClick={() => { if (slotAppts.length === 0) router.push(makeNewApptUrl(current, hour)); }}
                style={{ borderTop: "1px solid var(--stone-mid)", padding: "4px 0 4px 8px", minHeight: "52px", cursor: slotAppts.length === 0 ? "pointer" : "default", transition: "background 0.15s" }}
                onMouseEnter={(e) => { if (slotAppts.length === 0) e.currentTarget.style.background = "rgba(143,173,200,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                title={slotAppts.length === 0 ? "Click to add appointment" : undefined}
              >
                {slotAppts.map((appt) => (
                  <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                    <div style={{ padding: "6px 10px", borderRadius: "6px", marginBottom: "4px", background: "rgba(0,0,0,0.04)", borderLeft: `3px solid ${statusColor(appt.status)}` }}>
                      <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>{getClientName(clients, appt.clientId)}</p>
                      <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{appt.serviceName}</p>
                    </div>
                  </Link>
                ))}
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
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { if (slotAppts.length === 0) router.push(makeNewApptUrl(day, hour)); }}
                  style={{ borderTop: "1px solid var(--stone-mid)", borderLeft: "1px solid var(--stone-mid)", padding: "3px", minHeight: "44px", cursor: slotAppts.length === 0 ? "pointer" : "default", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { if (slotAppts.length === 0) e.currentTarget.style.background = "rgba(143,173,200,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  title={slotAppts.length === 0 ? "Click to add appointment" : undefined}
                >
                  {slotAppts.map((appt) => (
                    <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                      <div style={{ padding: "2px 5px", borderRadius: "4px", marginBottom: "2px", background: "rgba(0,0,0,0.04)", borderLeft: `2px solid ${statusColor(appt.status)}`, fontSize: "9px", color: "var(--text-on-stone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getClientName(clients, appt.clientId)}
                      </div>
                    </Link>
                  ))}
                </div>
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
                    <div key={a.id} style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor(a.status) }} />
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
  );
}
