"use client";

import { useState, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Link from "next/link";
import { Trash2, Maximize2, Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────
type WidgetType = "schedule" | "revenue" | "formulas" | "tasks" | "activity" | "inventory";

interface Widget {
  id: string;
  type: WidgetType;
  cols: 1 | 2 | 3;
  rows: 1 | 2;
}

const SIZE_OPTIONS = [
  { label: "S", cols: 1 as const, rows: 1 as const },
  { label: "M", cols: 1 as const, rows: 2 as const },
  { label: "W", cols: 2 as const, rows: 1 as const },
  { label: "L", cols: 2 as const, rows: 2 as const },
  { label: "XL", cols: 3 as const, rows: 1 as const },
];

const ALL_WIDGET_TYPES: { type: WidgetType; label: string; defaultCols: 1|2|3; defaultRows: 1|2 }[] = [
  { type: "schedule", label: "Schedule", defaultCols: 2, defaultRows: 2 },
  { type: "revenue", label: "Revenue", defaultCols: 1, defaultRows: 1 },
  { type: "formulas", label: "Formulas", defaultCols: 1, defaultRows: 1 },
  { type: "tasks", label: "Tasks", defaultCols: 2, defaultRows: 1 },
  { type: "activity", label: "Activity", defaultCols: 1, defaultRows: 1 },
  { type: "inventory", label: "Inventory", defaultCols: 3, defaultRows: 1 },
];

const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "schedule", cols: 2, rows: 2 },
  { id: "w2", type: "revenue", cols: 1, rows: 1 },
  { id: "w3", type: "formulas", cols: 1, rows: 1 },
  { id: "w4", type: "tasks", cols: 2, rows: 1 },
  { id: "w5", type: "activity", cols: 1, rows: 1 },
  { id: "w6", type: "inventory", cols: 3, rows: 1 },
];

// ── Props ──────────────────────────────────────────────────────────────
interface Appointment { id: string; startAt: string; clientId: string; serviceName: string; status: string; }
interface Formula { id: string; }
interface Task { id: string; title: string; status: string; dueAt?: string; }
interface Product { id: string; brand: string; shade?: string; quantity?: number; lowStockThreshold?: number; }
interface Client { id: string; firstName?: string; lastName?: string; preferredName?: string; }

interface WidgetDashboardProps {
  appointments: Appointment[];
  formulas: Formula[];
  tasks: Task[];
  products: Product[];
  clients: Client[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function getClientName(clients: Client[], id: string) {
  const c = clients.find((cl) => cl.id === id);
  if (!c) return "Unknown";
  return c.preferredName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";
}

// ── Draggable Widget Shell ─────────────────────────────────────────────
function DraggableWidget({
  widget, editMode, onDelete, onResize, children,
}: {
  widget: Widget; editMode: boolean;
  onDelete: (id: string) => void;
  onResize: (id: string, cols: 1|2|3, rows: 1|2) => void;
  children: React.ReactNode;
}) {
  const [showSizePicker, setShowSizePicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "WIDGET",
    item: { id: widget.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => editMode,
  });

  const [, drop] = useDrop({ accept: "WIDGET" });

  drag(drop(ref));

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
        position: "relative",
        overflow: "visible",
        minHeight: widget.rows === 2 ? "280px" : "140px",
      }}
    >
      {editMode && (
        <div style={{ position: "absolute", top: "6px", right: "6px", zIndex: 20, display: "flex", gap: "4px" }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSizePicker(!showSizePicker); }}
              style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--brass-warm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
            >
              <Maximize2 size={11} />
            </button>
            {showSizePicker && (
              <div style={{ position: "absolute", top: "26px", right: 0, background: "var(--stone-card)", borderRadius: "6px", padding: "6px", display: "flex", gap: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", border: "1px solid var(--stone-mid)", zIndex: 30 }}>
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={(e) => { e.stopPropagation(); onResize(widget.id, s.cols, s.rows); setShowSizePicker(false); }}
                    style={{ width: "28px", height: "24px", borderRadius: "4px", background: widget.cols === s.cols && widget.rows === s.rows ? "var(--brass)" : "var(--stone-mid)", color: "var(--text-on-stone)", fontSize: "9px", border: "none", fontWeight: 600 }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
            style={{ width: "22px", height: "22px", borderRadius: "4px", background: "var(--status-low)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Widget Head ────────────────────────────────────────────────────────
function WidgetHead({ title, link }: { title: string; link: string }) {
  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--stone-mid)" }}>
      <Link href={link}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400 }}>
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
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "12px", color: "var(--text-on-stone)", fontWeight: 400 }}>
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
export function WidgetDashboard({ appointments, formulas, tasks, products, clients }: WidgetDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  const todayAppts = appointments.filter((a) => { const d = new Date(a.startAt); return d >= today && d <= todayEnd; });
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  const deleteWidget = useCallback((id: string) => setWidgets((p) => p.filter((w) => w.id !== id)), []);
  const resizeWidget = useCallback((id: string, cols: 1|2|3, rows: 1|2) =>
    setWidgets((p) => p.map((w) => w.id === id ? { ...w, cols, rows } : w)), []);
  const addWidget = (type: WidgetType) => {
    const def = ALL_WIDGET_TYPES.find((t) => t.type === type);
    if (!def) return;
    setWidgets((p) => [...p, { id: `w${Date.now()}`, type, cols: def.defaultCols, rows: def.defaultRows }]);
    setShowAddMenu(false);
  };

  const renderContent = (widget: Widget) => {
    switch (widget.type) {
      case "schedule": {
        const SCHED_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM–7PM
        const fmtHr = (h: number) => h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
        const currentHour = now.getHours();
        return (
          <>
            <WidgetHead title="Today's Schedule" link="/app/appointments" />
            <div style={{ overflow: "auto", height: "calc(100% - 37px)", position: "relative" }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", minHeight: "100%" }}>
                {SCHED_HOURS.map((hour) => {
                  const slotAppts = todayAppts.filter((a) => new Date(a.startAt).getHours() === hour);
                  const isCurrentHour = hour === currentHour;
                  return (
                    <div key={hour} style={{ display: "contents" }}>
                      <div style={{ padding: "4px 4px 0 0", textAlign: "right", fontSize: "8px", fontWeight: isCurrentHour ? 600 : 400, color: isCurrentHour ? "var(--garnet)" : "var(--text-on-stone-ghost)", lineHeight: 1 }}>
                        {fmtHr(hour)}
                      </div>
                      <div style={{ borderTop: "1px solid var(--stone-mid)", padding: "2px 4px", minHeight: "36px", position: "relative", background: isCurrentHour ? "rgba(68,6,6,0.03)" : "transparent" }}>
                        {slotAppts.map((appt) => {
                          const isPast = new Date(appt.startAt) < now;
                          const statusClr = appt.status === "completed" ? "var(--status-confirmed)" : appt.status === "cancelled" ? "var(--status-low)" : "var(--garnet-vivid)";
                          return (
                            <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                              <div style={{ padding: "3px 6px", borderRadius: "4px", marginBottom: "2px", background: isPast ? "rgba(0,0,0,0.04)" : "var(--garnet-wash)", opacity: isPast ? 0.55 : 1, borderLeft: `2px solid ${statusClr}` }}>
                                <p style={{ fontSize: "9px", fontWeight: 500, color: "var(--text-on-stone)", lineHeight: 1.3 }}>{getClientName(clients, appt.clientId)}</p>
                                <p style={{ fontSize: "8px", color: "var(--text-on-stone-faint)", lineHeight: 1.2 }}>
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
            <WidgetHead title="Activity" link="/app/clients" />
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
      case "inventory":
        return (
          <>
            <WidgetHead title="Inventory" link="/app/products" />
            <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {products.slice(0, 8).map((p) => {
                const isLow = p.quantity !== undefined && p.lowStockThreshold !== undefined && p.quantity <= p.lowStockThreshold;
                return (
                  <span key={p.id} style={{ padding: "3px 8px", borderRadius: "100px", fontSize: "9px", background: isLow ? "rgba(117,18,18,0.15)" : "var(--stone-mid)", color: isLow ? "var(--status-low)" : "var(--text-on-stone)", border: isLow ? "1px solid rgba(117,18,18,0.3)" : "none" }}>
                    {isLow ? "⚠ " : ""}{p.brand}{p.shade ? ` ${p.shade}` : ""}
                  </span>
                );
              })}
              {products.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-on-stone-faint)" }}>No products</p>}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>Practitioner Suite</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", color: "var(--text-on-bark)", fontWeight: 300, marginTop: "2px" }}>Dashboard</h1>
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

      {/* Widget Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {widgets.map((widget) => (
          <DraggableWidget key={widget.id} widget={widget} editMode={editMode} onDelete={deleteWidget} onResize={resizeWidget}>
            {renderContent(widget)}
          </DraggableWidget>
        ))}
      </div>
    </DndProvider>
  );
}
