import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// ─── Shared Types ────────────────────────────────────────────────────────

export type DateRange = { startDate: string; endDate: string };

export type RevenueReport = {
  totalRevenue: number;
  totalServices: number;
  totalTips: number;
  byDay: { date: string; revenue: number; tips: number }[];
  byCategory: { category: string; revenue: number; count: number }[];
  byStudent: { studentId: string; studentName: string; revenue: number }[];
};

export type ServicesReport = {
  totalCompleted: number;
  totalCancelled: number;
  byCategory: { category: string; count: number }[];
  byStudent: { studentId: string; studentName: string; completed: number }[];
  byDay: { date: string; completed: number; cancelled: number }[];
};

export type ClientsReport = {
  totalClients: number;
  newClients: number;
  returningClients: number;
  retentionRate: number;
  avgVisits: number;
  byMonth: { month: string; newCount: number; returningCount: number }[];
};

export type InventoryReport = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  topUsed: { productName: string; brand: string; usageCount: number; usageValue: number }[];
  lowStock: { productName: string; brand: string; currentQty: number; threshold: number; reorderQty: number }[];
  movementsByType: { type: string; count: number; totalQty: number }[];
};

export type HoursReport = {
  totalHours: number;
  totalVerified: number;
  byStudent: { studentId: string; studentName: string; totalHours: number; verifiedHours: number }[];
  byWeek: { weekStart: string; hours: number }[];
};

// ─── Revenue ─────────────────────────────────────────────────────────────

export async function getRevenueReport(
  workspaceId: string,
  range: DateRange,
  studentId?: string,
): Promise<RevenueReport> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("student_earnings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("created_at", range.startDate)
    .lte("created_at", range.endDate + "T23:59:59Z");

  if (studentId) query = query.eq("student_id", studentId);

  const { data: earnings } = await query;
  const rows = earnings || [];

  let totalServices = 0;
  let totalTips = 0;
  const dayMap: Record<string, { revenue: number; tips: number }> = {};
  const catMap: Record<string, { revenue: number; count: number }> = {};
  const studentMap: Record<string, { name: string; revenue: number }> = {};

  for (const r of rows) {
    const svc = Number(r.service_amount) || 0;
    const tip = Number(r.tip_amount) || 0;
    totalServices += svc;
    totalTips += tip;

    const day = (r.created_at as string).slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { revenue: 0, tips: 0 };
    dayMap[day].revenue += svc + tip;
    dayMap[day].tips += tip;

    const cat = (r.service_category as string) || "Uncategorized";
    if (!catMap[cat]) catMap[cat] = { revenue: 0, count: 0 };
    catMap[cat].revenue += svc + tip;
    catMap[cat].count += 1;

    const sid = r.student_id as string;
    if (!studentMap[sid]) studentMap[sid] = { name: (r.student_name as string) || "Unknown", revenue: 0 };
    studentMap[sid].revenue += svc + tip;
  }

  return {
    totalRevenue: totalServices + totalTips,
    totalServices,
    totalTips,
    byDay: Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    byStudent: Object.entries(studentMap)
      .map(([studentId, v]) => ({ studentId, studentName: v.name, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

// ─── Services ────────────────────────────────────────────────────────────

export async function getServicesReport(
  workspaceId: string,
  range: DateRange,
  studentId?: string,
  categoryId?: string,
): Promise<ServicesReport> {
  const admin = createSupabaseAdminClient();

  // Completed services
  let compQuery = admin
    .from("service_completions")
    .select("id, student_id, student_name, category_id, completed_at, service_categories(name)")
    .eq("workspace_id", workspaceId)
    .gte("completed_at", range.startDate)
    .lte("completed_at", range.endDate + "T23:59:59Z");

  if (studentId) compQuery = compQuery.eq("student_id", studentId);
  if (categoryId) compQuery = compQuery.eq("category_id", categoryId);

  // Cancelled appointments
  let cancelQuery = admin
    .from("appointments")
    .select("id, start_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "cancelled")
    .gte("start_at", range.startDate)
    .lte("start_at", range.endDate + "T23:59:59Z");

  const [{ data: completions }, { data: cancellations }] = await Promise.all([compQuery, cancelQuery]);
  const compRows = completions || [];
  const cancelRows = cancellations || [];

  const catMap: Record<string, { name: string; count: number }> = {};
  const studentMap: Record<string, { name: string; count: number }> = {};
  const dayMap: Record<string, { completed: number; cancelled: number }> = {};

  for (const c of compRows) {
    const catName = (c.service_categories as unknown as Record<string, unknown>)?.name as string || "Unknown";
    const catId = c.category_id as string;
    if (!catMap[catId]) catMap[catId] = { name: catName, count: 0 };
    catMap[catId].count += 1;

    const sid = c.student_id as string;
    if (!studentMap[sid]) studentMap[sid] = { name: (c.student_name as string) || "Unknown", count: 0 };
    studentMap[sid].count += 1;

    const day = (c.completed_at as string).slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { completed: 0, cancelled: 0 };
    dayMap[day].completed += 1;
  }

  for (const a of cancelRows) {
    const day = (a.start_at as string).slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { completed: 0, cancelled: 0 };
    dayMap[day].cancelled += 1;
  }

  return {
    totalCompleted: compRows.length,
    totalCancelled: cancelRows.length,
    byCategory: Object.entries(catMap)
      .map(([, v]) => ({ category: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
    byStudent: Object.entries(studentMap)
      .map(([studentId, v]) => ({ studentId, studentName: v.name, completed: v.count }))
      .sort((a, b) => b.completed - a.completed),
    byDay: Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ─── Clients ─────────────────────────────────────────────────────────────

export async function getClientsReport(
  workspaceId: string,
  range: DateRange,
): Promise<ClientsReport> {
  const admin = createSupabaseAdminClient();

  // All clients in workspace
  const { data: clients } = await admin
    .from("clients")
    .select("id, created_at")
    .eq("workspace_id", workspaceId);

  // Completed appointments in range
  const { data: appointments } = await admin
    .from("appointments")
    .select("id, client_id, start_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .gte("start_at", range.startDate)
    .lte("start_at", range.endDate + "T23:59:59Z");

  const allClients = clients || [];
  const appts = appointments || [];

  // All completed appointments (for retention calculation)
  const { data: allAppts } = await admin
    .from("appointments")
    .select("id, client_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed");

  const allApptsArr = allAppts || [];

  // Client visit counts (all time)
  const visitCounts: Record<string, number> = {};
  for (const a of allApptsArr) {
    const cid = a.client_id as string;
    visitCounts[cid] = (visitCounts[cid] || 0) + 1;
  }

  // New = created within the date range
  const newClients = allClients.filter(
    (c) => (c.created_at as string) >= range.startDate && (c.created_at as string) <= range.endDate + "T23:59:59Z"
  );

  // Returning = had appointment in range AND was created before the range
  const returningClients = appts.filter((a) => {
    const client = allClients.find((c) => c.id === a.client_id);
    return client && (client.created_at as string) < range.startDate;
  });
  const returningSet = new Set(returningClients.map((a) => a.client_id as string));

  // Retention = clients with 2+ total visits / total clients
  const clientsWith2Plus = Object.values(visitCounts).filter((v) => v >= 2).length;
  const retentionRate = allClients.length > 0 ? clientsWith2Plus / allClients.length : 0;

  // Average visits
  const totalVisits = Object.values(visitCounts).reduce((s, v) => s + v, 0);
  const avgVisits = allClients.length > 0 ? totalVisits / allClients.length : 0;

  // By month
  const monthMap: Record<string, { newCount: number; returningCount: number }> = {};
  for (const c of newClients) {
    const month = (c.created_at as string).slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { newCount: 0, returningCount: 0 };
    monthMap[month].newCount += 1;
  }
  for (const cid of returningSet) {
    // Find first appointment in range for this client
    const firstAppt = appts.find((a) => a.client_id === cid);
    if (firstAppt) {
      const month = (firstAppt.start_at as string).slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { newCount: 0, returningCount: 0 };
      monthMap[month].returningCount += 1;
    }
  }

  return {
    totalClients: allClients.length,
    newClients: newClients.length,
    returningClients: returningSet.size,
    retentionRate: Math.round(retentionRate * 100) / 100,
    avgVisits: Math.round(avgVisits * 10) / 10,
    byMonth: Object.entries(monthMap)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

// ─── Inventory ───────────────────────────────────────────────────────────

export async function getInventoryReport(
  workspaceId: string,
  range: DateRange,
): Promise<InventoryReport> {
  const admin = createSupabaseAdminClient();

  const [{ data: products }, { data: movements }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, brand, line, shade, quantity, low_stock_threshold, reorder_quantity, unit_cost, active")
      .eq("workspace_id", workspaceId)
      .eq("active", true),
    admin
      .from("stock_movements")
      .select("product_id, movement_type, quantity_change, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", range.startDate)
      .lte("created_at", range.endDate + "T23:59:59Z"),
  ]);

  const prods = products || [];
  const moves = movements || [];

  const lowStockCount = prods.filter(
    (p) => (p.quantity as number) <= (p.low_stock_threshold as number) && (p.quantity as number) > 0
  ).length;
  const outOfStockCount = prods.filter((p) => (p.quantity as number) <= 0).length;

  // Usage by product (service_deduct movements)
  const usageMap: Record<string, { count: number; totalQty: number }> = {};
  const typeMap: Record<string, { count: number; totalQty: number }> = {};

  for (const m of moves) {
    const type = m.movement_type as string;
    if (!typeMap[type]) typeMap[type] = { count: 0, totalQty: 0 };
    typeMap[type].count += 1;
    typeMap[type].totalQty += Math.abs(Number(m.quantity_change) || 0);

    if (type === "service_deduct") {
      const pid = m.product_id as string;
      if (!usageMap[pid]) usageMap[pid] = { count: 0, totalQty: 0 };
      usageMap[pid].count += 1;
      usageMap[pid].totalQty += Math.abs(Number(m.quantity_change) || 0);
    }
  }

  const prodMap = Object.fromEntries(prods.map((p) => [p.id, p]));

  const topUsed = Object.entries(usageMap)
    .map(([pid, v]) => {
      const prod = prodMap[pid];
      return {
        productName: prod ? `${prod.brand || ""} ${prod.name || ""}`.trim() : "Unknown",
        brand: (prod?.brand as string) || "",
        usageCount: v.count,
        usageValue: v.totalQty * (Number(prod?.unit_cost) || 0),
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  const lowStock = prods
    .filter((p) => (p.quantity as number) <= (p.low_stock_threshold as number))
    .map((p) => ({
      productName: `${p.brand || ""} ${p.name || ""}`.trim(),
      brand: (p.brand as string) || "",
      currentQty: p.quantity as number,
      threshold: p.low_stock_threshold as number,
      reorderQty: (p.reorder_quantity as number) || 0,
    }))
    .sort((a, b) => a.currentQty - b.currentQty);

  return {
    totalProducts: prods.length,
    lowStockCount,
    outOfStockCount,
    topUsed,
    lowStock,
    movementsByType: Object.entries(typeMap)
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.count - a.count),
  };
}

// ─── Hours ───────────────────────────────────────────────────────────────

export async function getHoursReport(
  workspaceId: string,
  range: DateRange,
  studentId?: string,
): Promise<HoursReport> {
  const admin = createSupabaseAdminClient();

  // Get totals
  let totalsQuery = admin
    .from("hour_totals")
    .select("student_id, student_name, total_hours, verified_hours")
    .eq("workspace_id", workspaceId);

  if (studentId) totalsQuery = totalsQuery.eq("student_id", studentId);

  // Get entries in range for weekly breakdown
  let entriesQuery = admin
    .from("time_entries")
    .select("student_id, student_name, clock_in, duration_minutes")
    .eq("workspace_id", workspaceId)
    .gte("clock_in", range.startDate)
    .lte("clock_in", range.endDate + "T23:59:59Z");

  if (studentId) entriesQuery = entriesQuery.eq("student_id", studentId);

  const [{ data: totals }, { data: entries }] = await Promise.all([totalsQuery, entriesQuery]);
  const totalsArr = totals || [];
  const entriesArr = entries || [];

  let totalHours = 0;
  let totalVerified = 0;
  const byStudent = totalsArr.map((t) => {
    const th = Number(t.total_hours) || 0;
    const vh = Number(t.verified_hours) || 0;
    totalHours += th;
    totalVerified += vh;
    return {
      studentId: t.student_id as string,
      studentName: (t.student_name as string) || "Unknown",
      totalHours: th,
      verifiedHours: vh,
    };
  });

  // Weekly breakdown from entries
  const weekMap: Record<string, number> = {};
  for (const e of entriesArr) {
    const clockIn = new Date(e.clock_in as string);
    // Get Monday of that week
    const day = clockIn.getDay();
    const diff = clockIn.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(clockIn);
    monday.setDate(diff);
    const weekStart = monday.toISOString().slice(0, 10);
    const hours = (Number(e.duration_minutes) || 0) / 60;
    weekMap[weekStart] = (weekMap[weekStart] || 0) + hours;
  }

  return {
    totalHours,
    totalVerified,
    byStudent: byStudent.sort((a, b) => b.totalHours - a.totalHours),
    byWeek: Object.entries(weekMap)
      .map(([weekStart, hours]) => ({ weekStart, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  };
}

// ─── CSV Export ──────────────────────────────────────────────────────────

export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
