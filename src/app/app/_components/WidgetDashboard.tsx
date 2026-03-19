"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Link from "next/link";
import { Trash2, Maximize2, Plus } from "lucide-react";
import { LiveClock } from "@/components/LiveClock";

// ── Types ──────────────────────────────────────────────────────────────
type WidgetType = "schedule" | "revenue" | "formulas" | "tasks" | "activity" | "inventory" | "inspoFlags";

interface Widget {
  id: string;
  type: WidgetType;
  cols: number;
  rows: number;
}

const ALL_WIDGET_TYPES: { type: WidgetType; label: string; defaultCols: number; defaultRows: number }[] = [
  { type: "schedule", label: "Schedule", defaultCols: 6, defaultRows: 10 },
  { type: "revenue", label: "Revenue", defaultCols: 4, defaultRows: 4 },
  { type: "formulas", label: "Formulas", defaultCols: 4, defaultRows: 4 },
  { type: "tasks", label: "Tasks", defaultCols: 6, defaultRows: 6 },
  { type: "activity", label: "Activity", defaultCols: 4, defaultRows: 5 },
  { type: "inventory", label: "Inventory", defaultCols: 10, defaultRows: 4 },
  { type: "inspoFlags", label: "Inspo Flags", defaultCols: 6, defaultRows: 6 },
];

const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "schedule", cols: 6, rows: 10 },
  { id: "w2", type: "revenue", cols: 4, rows: 4 },
  { id: "w3", type: "formulas", cols: 4, rows: 4 },
  { id: "w4", type: "tasks", cols: 6, rows: 6 },
  { id: "w5", type: "activity", cols: 4, rows: 5 },
  { id: "w6", type: "inventory", cols: 10, rows: 4 },
];

const clampGrid = (v: number) => Math.max(1, Math.min(16, v));

const STORAGE_KEY = "opelle-widget-layout";

function loadWidgets(): Widget[] {
  if (typeof window === "undefined") return DEFAULT_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(raw) as Widget[];
    // Validate structure
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WIDGETS;
    const valid = parsed.every(
      (w) => w.id && w.type && typeof w.cols === "number" && typeof w.rows === "number"
    );
    return valid ? parsed : DEFAULT_WIDGETS;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveWidgets(widgets: Widget[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

// ── Props ──────────────────────────────────────────────────────────────
interface Appointment { id: string; startAt: string; clientId: string; serviceName: string; status: string; }
interface Formula { id: string; }
interface Task { id: string; title: string; status: string; dueAt?: string; }
interface Product { id: string; brand: string; shade?: string; quantity?: number; lowStockThreshold?: number; }
interface Client { id: string; firstName?: string; lastName?: string; preferredName?: string; }

interface InspoFlag {
  id: string;
  clientId: string;
  stylistFlag: string | null;
  createdAt: string;
}

interface WidgetDashboardProps {
  appointments: Appointment[];
  formulas: Formula[];
  tasks: Task[];
  products: Product[];
  clients: Client[];
  inspoFlags?: InspoFlag[];
  workingHours?: Record<string, { start: string; end: string; closed: boolean }>;
}

// ── Helpers ────────────────────────────────────────────────────────────
function getClientName(clients: Client[], id: string) {
  const c = clients.find((cl) => cl.id === id);
  if (!c) return "Unknown";
  return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
}

// ── Draggable Widget Shell ─────────────────────────────────────────────
function DraggableWidget({
  widget, editMode, onDelete, onResize, onMove, gridRef, children,
}: {
  widget: Widget; editMode: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, cols: number, rows: number) => void;
  onMove: (dragId: string, hoverId: string) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [inputCols, setInputCols] = useState(String(widget.cols));
  const [inputRows, setInputRows] = useState(String(widget.rows));
  const ref = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startCols: number; startRows: number; dir: string } | null>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "WIDGET",
    item: { id: widget.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => editMode,
  });

  const [, drop] = useDrop({
    accept: "WIDGET",
    hover: (item: { id: string }) => {
      if (item.id !== widget.id) {
        onMove(item.id, widget.id);
      }
    },
  });

  drag(drop(ref));

  // Sync inputs when widget changes externally (e.g. drag resize)
  const prevCols = useRef(widget.cols);
  const prevRows = useRef(widget.rows);
  if (prevCols.current !== widget.cols) { prevCols.current = widget.cols; if (!showSizePicker) setInputCols(String(widget.cols)); }
  if (prevRows.current !== widget.rows) { prevRows.current = widget.rows; if (!showSizePicker) setInputRows(String(widget.rows)); }

  const handleApplySize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResize(widget.id, clampGrid(parseInt(inputCols) || 1), clampGrid(parseInt(inputRows) || 1));
    setShowSizePicker(false);
  };

  const startDragResize = (dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const cellW = gridEl.getBoundingClientRect().width / 16;
    const cellH = gridEl.getBoundingClientRect().height / 16;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startCols: widget.cols, startRows: widget.rows, dir };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      let newCols = resizeRef.current.startCols;
      let newRows = resizeRef.current.startRows;
      if (dir === "right" || dir === "corner") newCols = clampGrid(resizeRef.current.startCols + Math.round(dx / cellW));
      if (dir === "bottom" || dir === "corner") newRows = clampGrid(resizeRef.current.startRows + Math.round(dy / cellH));
      onResize(widget.id, newCols, newRows);
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={ref}
      className={editMode ? "wiggle" : ""}
      style={{
        gridColumn: `span ${widget.cols}`,
        gridRow: `span ${widget.rows}`,
        background: "var(--stone-card)",
        borderRadius: "8px",
        boxShadow: "0 3px 14px rgba(0,0,0,0.16)",
        opacity: isDragging ? 0.5 : 1,
        cursor: editMode ? (isDragging ? "grabbing" : "grab") : "default",
        position: "relative",
        overflow: "visible",
        transition: isDragging ? "none" : "transform 0.2s ease",
      }}
    >
      {editMode && (
        <>
          {/* Edit controls */}
          <div style={{ position: "absolute", top: "6px", right: "6px", zIndex: 20, display: "flex", gap: "4px" }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showSizePicker) { setInputCols(String(widget.cols)); setInputRows(String(widget.rows)); }
                  setShowSizePicker(!showSizePicker);
                }}
                style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--brass-warm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
              >
                <Maximize2 size={11} />
              </button>
              {showSizePicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: "28px", right: 0, background: "var(--stone-card)", borderRadius: "8px", padding: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", border: "1px solid var(--stone-mid)", zIndex: 40, minWidth: "140px" }}
                >
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", marginBottom: "4px" }}>Dimensions</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <input
                      type="number" min={1} max={16}
                      value={inputCols}
                      onChange={(e) => setInputCols(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "44px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--stone-warm)", background: "var(--stone-light)", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textAlign: "center", color: "var(--text-on-stone)" }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", fontWeight: 500 }}>&times;</span>
                    <input
                      type="number" min={1} max={16}
                      value={inputRows}
                      onChange={(e) => setInputRows(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "44px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--stone-warm)", background: "var(--stone-light)", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textAlign: "center", color: "var(--text-on-stone)" }}
                    />
                  </div>
                  <button
                    onClick={handleApplySize}
                    style={{ width: "100%", padding: "5px", borderRadius: "4px", border: "none", background: "var(--garnet)", color: "var(--stone-lightest)", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer" }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
              style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--status-low)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
            >
              <Trash2 size={11} />
            </button>
          </div>
          {/* Drag resize handles */}
          <div onMouseDown={startDragResize("right")} style={{ position: "absolute", top: "20%", right: "-4px", width: "6px", height: "60%", background: "var(--brass-soft)", borderRadius: "3px", cursor: "ew-resize", zIndex: 20 }} />
          <div onMouseDown={startDragResize("bottom")} style={{ position: "absolute", left: "20%", bottom: "-4px", width: "60%", height: "6px", background: "var(--brass-soft)", borderRadius: "3px", cursor: "ns-resize", zIndex: 20 }} />
          <div onMouseDown={startDragResize("corner")} style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "14px", height: "14px", background: "var(--brass)", border: "2px solid var(--stone-card)", borderRadius: "3px", cursor: "nwse-resize", zIndex: 20 }} />
        </>
      )}
      {children}
    </div>
  );
}

// ── Widget Head ────────────────────────────────────────────────────────
function WidgetHead({ title, link }: { title: string; link: string }) {
  return (
    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--stone-mid)" }}>
      <Link href={link} style={{ textDecoration: "none" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "14px", color: "var(--text-on-stone, #2C2C2A)", fontWeight: 600 }}>
          {title}
        </p>
      </Link>
    </div>
  );
}

// ── Stat Widget ────────────────────────────────────────────────────────
function StatWidget({ value, label, change, changePositive, link }: {
  value: string; label: string; change?: string; changePositive?: boolean; link: string;
}) {
  return (
    <Link href={link} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--stone-mid)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone, #2C2C2A)", fontWeight: 600 }}>
          {label.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
        </p>
      </div>
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--text-on-stone)", fontWeight: 300, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", marginTop: "6px" }}>
          {label}
        </p>
        {change && (
          <p style={{ fontSize: "9px", color: changePositive ? "var(--status-confirmed)" : "var(--status-low)", marginTop: "4px" }}>
            {change}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export function WidgetDashboard({ appointments, formulas, tasks, products, clients, inspoFlags = [], workingHours }: WidgetDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load saved layout from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = loadWidgets();
    setWidgets(saved);
    setHydrated(true);
  }, []);

  // Persist widget layout on every change — but only after hydration
  useEffect(() => {
    if (hydrated) saveWidgets(widgets);
  }, [widgets, hydrated]);

  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  const todayAppts = appointments.filter((a) => { const d = new Date(a.startAt); return d >= today && d <= todayEnd; });
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  // Phase E: Inventory predictions (async, non-blocking)
  const [predictions, setPredictions] = useState<{
    predictions: { productId: string; estimatedDaysUntilDepletion: number | null; avgUsagePerWeek: number }[];
    criticalCount: number;
    warningCount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/inventory-predictions", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setPredictions(data); })
      .catch(() => {});
  }, []);

  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(48);

  // Measure grid column width so rows can match → square cells
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const gap = 10; // matches gap in grid style
      const w = el.getBoundingClientRect().width;
      const colW = (w - gap * 15) / 16;
      if (colW > 0) setCellSize(Math.round(colW));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const deleteWidget = useCallback((id: string) => setWidgets((p) => p.filter((w) => w.id !== id)), []);
  const resizeWidget = useCallback((id: string, cols: number, rows: number) =>
    setWidgets((p) => p.map((w) => w.id === id ? { ...w, cols: clampGrid(cols), rows: clampGrid(rows) } : w)), []);
  const moveWidget = useCallback((dragId: string, hoverId: string) => {
    setWidgets((prev) => {
      const dragIdx = prev.findIndex((w) => w.id === dragId);
      const hoverIdx = prev.findIndex((w) => w.id === hoverId);
      if (dragIdx === -1 || hoverIdx === -1 || dragIdx === hoverIdx) return prev;
      const next = [...prev];
      const [dragged] = next.splice(dragIdx, 1);
      next.splice(hoverIdx, 0, dragged);
      return next;
    });
  }, []);
  const addWidget = (type: WidgetType) => {
    const def = ALL_WIDGET_TYPES.find((t) => t.type === type);
    if (!def) return;
    setWidgets((p) => [...p, { id: `w${Date.now()}`, type, cols: def.defaultCols, rows: def.defaultRows }]);
    setShowAddMenu(false);
  };

  const renderContent = (widget: Widget) => {
    switch (widget.type) {
      case "schedule": {
        const SCHED_HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8AM–8PM
        const fmtHr = (h: number) => h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
        const currentHour = now.getHours();
        const DAY_NAME_MAP_W = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayDayName = DAY_NAME_MAP_W[now.getDay()];
        const todayWh = workingHours?.[todayDayName];
        const todayOpen = todayWh && !todayWh.closed ? parseInt(todayWh.start.split(":")[0]) : 9;
        const todayClose = todayWh && !todayWh.closed ? parseInt(todayWh.end.split(":")[0]) : 18;
        const todayClosed = todayWh?.closed || (!workingHours && now.getDay() === 0);
        return (
          <>
            <WidgetHead title="Today's Schedule" link="/app/appointments" />
            <div style={{ overflow: "auto", height: "calc(100% - 37px)", position: "relative" }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", minHeight: "100%" }}>
                {SCHED_HOURS.map((hour) => {
                  const slotAppts = todayAppts.filter((a) => new Date(a.startAt).getHours() === hour);
                  const isCurrentHour = hour === currentHour;
                  const isClosedHour = todayClosed || hour < todayOpen || hour >= todayClose;
                  return (
                    <div key={hour} style={{ display: "contents" }}>
                      <div style={{ padding: "4px 4px 0 0", textAlign: "right", fontSize: "8px", fontWeight: isCurrentHour ? 600 : 400, color: isCurrentHour ? "var(--garnet)" : isClosedHour ? "var(--text-on-stone-ghost)" : "var(--text-on-stone-faint)", lineHeight: 1 }}>
                        {fmtHr(hour)}
                      </div>
                      <div style={{ borderTop: "1px solid var(--stone-mid)", padding: "2px 4px", minHeight: "44px", position: "relative", background: isCurrentHour ? "rgba(68,6,6,0.05)" : isClosedHour ? "rgba(0,0,0,0.06)" : "transparent" }}>
                        {slotAppts.map((appt) => {
                          const isPast = new Date(appt.startAt) < now;
                          const statusClr = appt.status === "completed" ? "var(--status-confirmed)" : appt.status === "cancelled" ? "var(--status-low)" : "var(--garnet-vivid)";
                          return (
                            <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                              <div style={{ padding: "8px 10px", borderRadius: "6px", marginBottom: "2px", background: isPast ? "rgba(74,26,46,0.12)" : "rgba(74,26,46,0.15)", opacity: isPast ? 0.75 : 1, borderLeft: `3px solid ${statusClr}`, minHeight: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#2C2C2A", lineHeight: 1.3 }}>{getClientName(clients, appt.clientId)}</p>
                                <p style={{ fontSize: "10px", color: "#5A5A52", lineHeight: 1.2 }}>
                                  {appt.serviceName} · {new Date(appt.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      }
      case "revenue":
        return <StatWidget value="—" label="Earned Today" change="See appointments" changePositive={true} link="/app/appointments" />;
      case "formulas":
        return <StatWidget value={String(formulas.length)} label="Active Formulas" change={`${formulas.length} total`} changePositive={formulas.length > 0} link="/app/formulas" />;
      case "tasks":
        return (
          <>
            <WidgetHead title="Tasks" link="/app/tasks" />
            <div style={{ padding: "8px 12px" }}>
              {pendingTasks.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>All done!</p>
              ) : pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "1px solid var(--stone-mid)" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "3px", border: "1px solid var(--stone-warm)", flexShrink: 0 }} />
                  <p style={{ fontSize: "10px", color: "var(--text-on-stone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</p>
                </div>
              ))}
            </div>
          </>
        );
      case "activity":
        return (
          <>
            <WidgetHead title="Activity" link="/app/history" />
            <div style={{ padding: "8px 12px" }}>
              {todayAppts.slice(0, 4).map((appt) => (
                <div key={appt.id} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: "1px solid var(--stone-mid)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--garnet)", marginTop: "4px", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "10px", color: "var(--text-on-stone)" }}>{getClientName(clients, appt.clientId)}</p>
                    <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>{new Date(appt.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              {todayAppts.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No activity today</p>}
            </div>
          </>
        );
      case "inventory": {
        const getPrediction = (pid: string) => predictions?.predictions?.find((p) => p.productId === pid);
        return (
          <>
            <WidgetHead title="Inventory" link="/app/products" />
            {predictions && (predictions.criticalCount > 0 || predictions.warningCount > 0) && (
              <div style={{ padding: "4px 12px", fontSize: "9px", background: predictions.criticalCount > 0 ? "rgba(117,18,18,0.08)" : "rgba(212,183,106,0.12)", color: predictions.criticalCount > 0 ? "var(--status-low)" : "var(--brass-warm)", borderBottom: "1px solid var(--stone-mid)" }}>
                {predictions.criticalCount > 0
                  ? `${predictions.criticalCount} product${predictions.criticalCount > 1 ? "s" : ""} running low soon`
                  : `${predictions.warningCount} to reorder this month`}
              </div>
            )}
            <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {products.slice(0, 8).map((p) => {
                const isLow = p.quantity !== undefined && p.lowStockThreshold !== undefined && p.quantity <= p.lowStockThreshold;
                const pred = getPrediction(p.id);
                const isCritical = pred && pred.estimatedDaysUntilDepletion !== null && pred.estimatedDaysUntilDepletion <= 14;
                const daysLabel = pred?.estimatedDaysUntilDepletion != null ? ` (${pred.estimatedDaysUntilDepletion}d)` : "";
                return (
                  <span
                    key={p.id}
                    title={pred ? `~${pred.estimatedDaysUntilDepletion ?? "?"}d remaining \u00b7 ${pred.avgUsagePerWeek.toFixed(1)}/wk` : undefined}
                    style={{ padding: "3px 8px", borderRadius: "100px", fontSize: "9px", background: isCritical ? "rgba(117,18,18,0.15)" : isLow ? "rgba(117,18,18,0.1)" : "var(--stone-mid)", color: isCritical || isLow ? "var(--status-low)" : "var(--text-on-stone)", border: isCritical ? "1px solid rgba(117,18,18,0.3)" : "none" }}
                  >
                    {isCritical ? "!! " : isLow ? "! " : ""}{p.brand}{p.shade ? ` ${p.shade}` : ""}{daysLabel}
                  </span>
                );
              })}
              {products.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No products</p>}
            </div>
          </>
        );
      }
      case "inspoFlags":
        return (
          <>
            <WidgetHead title="Inspo Flags" link="/app/formulas" />
            <div style={{ padding: "8px 12px" }}>
              {inspoFlags.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No pending inspo flags</p>
              ) : inspoFlags.slice(0, 5).map((flag) => (
                <Link key={flag.id} href={`/app/clients/${flag.clientId}`}>
                  <div style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--stone-mid)", alignItems: "flex-start" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--garnet-wash)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--garnet)" }}>
                        {getClientName(clients, flag.clientId).charAt(0)}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                        {getClientName(clients, flag.clientId)}
                      </p>
                      {flag.stylistFlag && (
                        <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {flag.stylistFlag}
                        </p>
                      )}
                    </div>
                    <span style={{ padding: "2px 6px", borderRadius: "100px", fontSize: "8px", fontWeight: 600, background: "var(--garnet-wash)", color: "var(--garnet)", flexShrink: 0, marginTop: "2px" }}>
                      Needs Review
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", marginTop: "24px" }}>
        <div>
          <p style={{ fontSize: "18px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#FFFFFF", fontWeight: 600 }}>Practitioner Suite</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "32px", color: "#000000", fontWeight: 400, marginTop: "2px" }}>Dashboard</h1>
          <LiveClock />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {editMode && (
            <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: "var(--status-confirmed)", color: "white", border: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              <Plus size={11} /> Add Widget
            </button>
          )}
          <button onClick={() => { setEditMode(!editMode); setShowAddMenu(false); }} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: editMode ? "var(--garnet)" : "var(--stone-mid)", color: editMode ? "var(--stone-lightest)" : "var(--text-on-stone)", border: editMode ? "1px solid var(--garnet-vivid)" : "1px solid var(--stone-warm)" }}>
            {editMode ? "Done" : "Edit Widgets"}
          </button>
        </div>
      </div>

      {/* Add Widget Menu */}
      {showAddMenu && (
        <div style={{ background: "var(--stone-card)", borderRadius: "8px", padding: "12px", marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "8px", border: "1px solid var(--stone-mid)" }}>
          {ALL_WIDGET_TYPES.filter((t) => !widgets.find((w) => w.type === t.type)).map((t) => (
            <button key={t.type} onClick={() => addWidget(t.type)} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "10px", background: "var(--stone-mid)", color: "var(--text-on-stone)", border: "1px solid var(--stone-warm)" }}>
              + {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Widget Grid — 16x16 freeform */}
      <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gridAutoRows: `${cellSize}px`, gap: "10px" }}>
        {widgets.map((widget) => (
          <DraggableWidget key={widget.id} widget={widget} editMode={editMode} onDelete={deleteWidget} onResize={resizeWidget} onMove={moveWidget} gridRef={gridRef}>
            {renderContent(widget)}
          </DraggableWidget>
        ))}
      </div>
    </DndProvider>
  );
}
