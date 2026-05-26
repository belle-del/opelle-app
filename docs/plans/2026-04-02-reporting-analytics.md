# Reporting & Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reporting dashboard at `/app/reports` with five report types (Revenue, Services, Clients, Inventory, Hours) — charts via Recharts, CSV export, role-based access.

**Architecture:** Client component page with tab-based navigation fetching from 5 API routes. Each API route queries existing tables directly (no pre-aggregation). A single `src/lib/db/reports.ts` file contains all query functions. Permission checks use existing `getWorkspaceId()` + `workspace_members` role lookup pattern.

**Tech Stack:** Next.js 16 App Router, Supabase (admin client), Recharts, existing Card/Button UI components, Tailwind v4, date-fns.

---

### Task 1: Install Recharts

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npm install recharts`

Expected: `added X packages` with no errors.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(reports): add recharts dependency"
```

---

### Task 2: Add Reports nav item to sidebar

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`

**Step 1: Add the BarChart3 import**

At line 8 in the lucide-react import block, add `BarChart3` to the imports:

```typescript
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  FlaskConical,
  Package,
  CheckSquare,
  Settings,
  LogOut,
  History,
  MessageCircle,
  FileText,
  Sparkles,
  Menu,
  X,
  Monitor,
  Timer,
  GraduationCap,
  ShoppingCart,
  Images,
  UsersRound,
  Megaphone,
  BarChart3,
} from "lucide-react";
```

**Step 2: Add visibility entry**

Add to `NAV_VISIBILITY` (after the `/app/marketing` line):

```typescript
"/app/reports":    ["god", "school", "salon"],
```

**Step 3: Add permission entry**

Add to `NAV_PERMISSIONS`:

```typescript
"/app/reports":    "reports.view",
```

**Step 4: Add nav item**

In `NAV_SECTIONS`, in the "Practice" section items array, add before the History item:

```typescript
{ href: "/app/reports", label: "Reports", icon: BarChart3 },
```

**Step 5: Verify the sidebar renders**

Run: `npm run build 2>&1 | tail -5`

Expected: Build succeeds (the page doesn't exist yet but the nav link is fine).

**Step 6: Commit**

```bash
git add src/app/app/_components/AppNav.tsx
git commit -m "feat(reports): add Reports nav item to sidebar"
```

---

### Task 3: Create report query functions (`src/lib/db/reports.ts`)

**Files:**
- Create: `src/lib/db/reports.ts`

**Step 1: Create the file with all 5 report query functions**

```typescript
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
    const catName = (c.service_categories as Record<string, unknown>)?.name as string || "Unknown";
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

  // Clients with appointments in date range
  const clientsInRange = new Set(appts.map((a) => a.client_id as string));

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
```

**Step 2: Verify it compiles**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit src/lib/db/reports.ts 2>&1 | head -20`

If there are type issues, fix them. The key thing is that the Supabase queries return `Record<string, unknown>` rows, so we cast explicitly.

**Step 3: Commit**

```bash
git add src/lib/db/reports.ts
git commit -m "feat(reports): add report query functions for all 5 report types"
```

---

### Task 4: Create the Revenue API route

**Files:**
- Create: `src/app/api/reports/revenue/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getRevenueReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Check role
    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "reports.view", overrides) && !hasPermission(role, "earnings.view_own", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    // Non-admin users can only see their own data
    let studentId = params.get("student_id") || undefined;
    if (!hasPermission(role, "reports.view", overrides)) {
      studentId = user.id;
    }

    const report = await getRevenueReport(workspaceId, { startDate, endDate }, studentId);

    if (format === "csv") {
      const csv = toCSV(
        ["date", "revenue", "tips"],
        report.byDay.map((d) => ({ date: d.date, revenue: d.revenue, tips: d.tips })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=revenue-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Revenue report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/reports/revenue/route.ts
git commit -m "feat(reports): add GET /api/reports/revenue endpoint"
```

---

### Task 5: Create the Services API route

**Files:**
- Create: `src/app/api/reports/services/route.ts`

**Step 1: Create the route**

Same auth/permission pattern as Task 4. Key differences:
- Accepts `category_id` param
- Calls `getServicesReport()` instead
- CSV exports `byDay` data (date, completed, cancelled)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getServicesReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "reports.view", overrides) && !hasPermission(role, "progress.view_own", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const categoryId = params.get("category_id") || undefined;
    const format = params.get("format");

    let studentId = params.get("student_id") || undefined;
    if (!hasPermission(role, "reports.view", overrides) && !hasPermission(role, "progress.view_all", overrides)) {
      studentId = user.id;
    }

    const report = await getServicesReport(workspaceId, { startDate, endDate }, studentId, categoryId);

    if (format === "csv") {
      const csv = toCSV(
        ["date", "completed", "cancelled"],
        report.byDay.map((d) => ({ date: d.date, completed: d.completed, cancelled: d.cancelled })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=services-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Services report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/reports/services/route.ts
git commit -m "feat(reports): add GET /api/reports/services endpoint"
```

---

### Task 6: Create the Clients API route

**Files:**
- Create: `src/app/api/reports/clients/route.ts`

**Step 1: Create the route**

Only accessible by roles with `reports.view` (owner/admin). No student filter needed — this is workspace-level data.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getClientsReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "reports.view", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    const report = await getClientsReport(workspaceId, { startDate, endDate });

    if (format === "csv") {
      const csv = toCSV(
        ["month", "newCount", "returningCount"],
        report.byMonth,
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=clients-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Clients report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/reports/clients/route.ts
git commit -m "feat(reports): add GET /api/reports/clients endpoint"
```

---

### Task 7: Create the Inventory API route

**Files:**
- Create: `src/app/api/reports/inventory/route.ts`

**Step 1: Create the route**

Requires `reports.view` or `products.view` permission. No student filter.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getInventoryReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "reports.view", overrides) && !hasPermission(role, "products.view", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    const report = await getInventoryReport(workspaceId, { startDate, endDate });

    if (format === "csv") {
      const csv = toCSV(
        ["productName", "brand", "currentQty", "threshold", "reorderQty"],
        report.lowStock,
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=inventory-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Inventory report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/reports/inventory/route.ts
git commit -m "feat(reports): add GET /api/reports/inventory endpoint"
```

---

### Task 8: Create the Hours API route

**Files:**
- Create: `src/app/api/reports/hours/route.ts`

**Step 1: Create the route**

Requires `hours.view_all` for all students, or `hours.view_own` for own data.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getHoursReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "hours.view_all", overrides) && !hasPermission(role, "hours.view_own", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    let studentId = params.get("student_id") || undefined;
    if (!hasPermission(role, "hours.view_all", overrides)) {
      studentId = user.id;
    }

    const report = await getHoursReport(workspaceId, { startDate, endDate }, studentId);

    if (format === "csv") {
      const csv = toCSV(
        ["studentName", "totalHours", "verifiedHours"],
        report.byStudent.map((s) => ({ studentName: s.studentName, totalHours: s.totalHours, verifiedHours: s.verifiedHours })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=hours-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Hours report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/reports/hours/route.ts
git commit -m "feat(reports): add GET /api/reports/hours endpoint"
```

---

### Task 9: Create shared report UI components

**Files:**
- Create: `src/components/reports/KPICard.tsx`
- Create: `src/components/reports/DateRangePicker.tsx`
- Create: `src/components/reports/ReportChart.tsx`
- Create: `src/components/reports/ReportTable.tsx`
- Create: `src/components/reports/ExportButton.tsx`

**Step 1: Create KPICard**

```typescript
// src/components/reports/KPICard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function KPICard({ label, value, subtitle }: KPICardProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-on-stone-faint)" }}>
          {label}
        </p>
        <p style={{ fontSize: "22px", fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)", fontWeight: 400, marginTop: "2px" }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ fontSize: "10px", color: "var(--text-on-stone-faint)", marginTop: "2px" }}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create DateRangePicker**

```typescript
// src/components/reports/DateRangePicker.tsx
"use client";

import { useState } from "react";

type Preset = "7d" | "30d" | "90d" | "custom";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<Preset>("30d");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const now = new Date();
    const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
    const start = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    onChange(start, end);
  };

  const presets: { key: Preset; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          style={{
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "10px",
            letterSpacing: "0.05em",
            border: "1px solid var(--stone-mid)",
            background: preset === p.key ? "var(--stone-mid)" : "transparent",
            color: "var(--text-on-stone)",
            cursor: "pointer",
          }}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            style={{
              padding: "3px 6px",
              borderRadius: "4px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              fontSize: "10px",
            }}
          />
          <span style={{ color: "var(--text-on-stone-faint)", fontSize: "10px" }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange(startDate, e.target.value)}
            style={{
              padding: "3px 6px",
              borderRadius: "4px",
              border: "1px solid var(--stone-mid)",
              background: "var(--stone-card)",
              color: "var(--text-on-stone)",
              fontSize: "10px",
            }}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create ReportChart**

```typescript
// src/components/reports/ReportChart.tsx
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
```

**Step 4: Create ReportTable**

```typescript
// src/components/reports/ReportTable.tsx
"use client";

interface Column {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

interface ReportTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
}

export function ReportTable({ columns, data }: ReportTableProps) {
  if (data.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "20px", color: "var(--text-on-stone-faint)", fontSize: "11px" }}>
        No data available
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--stone-mid)",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-on-stone-faint)",
                  fontWeight: 500,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "7px 10px",
                    borderBottom: "1px solid var(--stone-mid)",
                    color: "var(--text-on-stone)",
                  }}
                >
                  {col.format ? col.format(row[col.key]) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 5: Create ExportButton**

```typescript
// src/components/reports/ExportButton.tsx
"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  reportType: string;
  startDate: string;
  endDate: string;
  extraParams?: Record<string, string>;
}

export function ExportButton({ reportType, startDate, endDate, extraParams }: ExportButtonProps) {
  const handleExport = () => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      format: "csv",
      ...extraParams,
    });
    window.open(`/api/reports/${reportType}?${params.toString()}`, "_blank");
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5"
      style={{
        padding: "5px 10px",
        borderRadius: "4px",
        fontSize: "10px",
        border: "1px solid var(--stone-mid)",
        background: "transparent",
        color: "var(--text-on-stone)",
        cursor: "pointer",
      }}
    >
      <Download style={{ width: "12px", height: "12px" }} />
      Export CSV
    </button>
  );
}
```

**Step 6: Commit**

```bash
git add src/components/reports/
git commit -m "feat(reports): add shared UI components (KPICard, DateRangePicker, ReportChart, ReportTable, ExportButton)"
```

---

### Task 10: Create the Reports page

**Files:**
- Create: `src/app/app/reports/page.tsx`
- Create: `src/app/app/reports/_components/ReportsPage.tsx`

**Step 1: Create the server page**

```typescript
// src/app/app/reports/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { ReportsPage } from "./_components/ReportsPage";

export default async function Reports() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/app");

  return <ReportsPage />;
}
```

**Step 2: Create the client component**

```typescript
// src/app/app/reports/_components/ReportsPage.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/reports/KPICard";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { ExportButton } from "@/components/reports/ExportButton";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type {
  RevenueReport, ServicesReport, ClientsReport,
  InventoryReport, HoursReport,
} from "@/lib/db/reports";

type ReportTab = "revenue" | "services" | "clients" | "inventory" | "hours";

const TABS: { key: ReportTab; label: string; permission?: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "services", label: "Services" },
  { key: "clients", label: "Clients", permission: "reports.view" },
  { key: "inventory", label: "Inventory" },
  { key: "hours", label: "Hours" },
];

function formatCurrency(v: unknown) {
  return `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("revenue");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const { can, loading: permsLoading } = usePermissions();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const res = await fetch(`/api/reports/${tab}?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const visibleTabs = permsLoading
    ? TABS
    : TABS.filter((t) => !t.permission || can(t.permission as Parameters<typeof can>[0]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "16px", color: "var(--text-on-stone)", fontWeight: 400 }}>
          Reports
        </h1>
        <div className="flex items-center gap-3">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
          <ExportButton reportType={tab} startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid var(--stone-mid)" }}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 14px",
              fontSize: "10px",
              letterSpacing: "0.05em",
              color: tab === t.key ? "var(--text-on-stone)" : "var(--text-on-stone-faint)",
              borderBottom: tab === t.key ? "2px solid #8FADC8" : "2px solid transparent",
              background: "transparent",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "11px" }}>Loading report...</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-12">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "11px" }}>No data available or access denied</p>
        </div>
      ) : (
        <>
          {tab === "revenue" && <RevenueView data={data as unknown as RevenueReport} />}
          {tab === "services" && <ServicesView data={data as unknown as ServicesReport} />}
          {tab === "clients" && <ClientsView data={data as unknown as ClientsReport} />}
          {tab === "inventory" && <InventoryView data={data as unknown as InventoryReport} />}
          {tab === "hours" && <HoursView data={data as unknown as HoursReport} />}
        </>
      )}
    </div>
  );
}

// ─── Revenue View ────────────────────────────────────────────────────────

function RevenueView({ data }: { data: RevenueReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <KPICard label="Service Revenue" value={formatCurrency(data.totalServices)} />
        <KPICard label="Tips" value={formatCurrency(data.totalTips)} />
        <KPICard label="Avg / Day" value={formatCurrency(data.byDay.length ? data.totalRevenue / data.byDay.length : 0)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="line"
            data={data.byDay}
            xKey="date"
            yKeys={[
              { key: "revenue", color: "#8FADC8", name: "Revenue" },
              { key: "tips", color: "#C4AB70", name: "Tips" },
            ]}
          />
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            <ReportChart
              type="bar"
              data={data.byCategory}
              xKey="category"
              yKeys={[{ key: "revenue", color: "#8FADC8", name: "Revenue" }]}
              height={200}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By Student</CardTitle></CardHeader>
          <CardContent>
            <ReportTable
              columns={[
                { key: "studentName", label: "Student" },
                { key: "revenue", label: "Revenue", format: formatCurrency },
              ]}
              data={data.byStudent}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Services View ───────────────────────────────────────────────────────

function ServicesView({ data }: { data: ServicesReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard label="Completed" value={data.totalCompleted} />
        <KPICard label="Cancelled" value={data.totalCancelled} />
        <KPICard label="Completion Rate" value={
          data.totalCompleted + data.totalCancelled > 0
            ? `${Math.round((data.totalCompleted / (data.totalCompleted + data.totalCancelled)) * 100)}%`
            : "N/A"
        } />
      </div>
      <Card>
        <CardHeader><CardTitle>Services by Category</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="bar"
            data={data.byCategory}
            xKey="category"
            yKeys={[{ key: "count", color: "#8FADC8", name: "Count" }]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Daily Activity</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="line"
            data={data.byDay}
            xKey="date"
            yKeys={[
              { key: "completed", color: "#8FADC8", name: "Completed" },
              { key: "cancelled", color: "#B85450", name: "Cancelled" },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>By Student</CardTitle></CardHeader>
        <CardContent>
          <ReportTable
            columns={[
              { key: "studentName", label: "Student" },
              { key: "completed", label: "Completed" },
            ]}
            data={data.byStudent}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Clients View ────────────────────────────────────────────────────────

function ClientsView({ data }: { data: ClientsReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Clients" value={data.totalClients} />
        <KPICard label="New" value={data.newClients} />
        <KPICard label="Returning" value={data.returningClients} />
        <KPICard label="Retention Rate" value={`${Math.round(data.retentionRate * 100)}%`} subtitle={`Avg ${data.avgVisits} visits`} />
      </div>
      <Card>
        <CardHeader><CardTitle>New vs Returning by Month</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="bar"
            data={data.byMonth}
            xKey="month"
            yKeys={[
              { key: "newCount", color: "#8FADC8", name: "New" },
              { key: "returningCount", color: "#C4AB70", name: "Returning" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inventory View ──────────────────────────────────────────────────────

function InventoryView({ data }: { data: InventoryReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard label="Total Products" value={data.totalProducts} />
        <KPICard label="Low Stock" value={data.lowStockCount} />
        <KPICard label="Out of Stock" value={data.outOfStockCount} />
      </div>
      <Card>
        <CardHeader><CardTitle>Top Used Products</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="bar"
            data={data.topUsed}
            xKey="productName"
            yKeys={[{ key: "usageCount", color: "#8FADC8", name: "Usage Count" }]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Low Stock Items</CardTitle></CardHeader>
        <CardContent>
          <ReportTable
            columns={[
              { key: "productName", label: "Product" },
              { key: "brand", label: "Brand" },
              { key: "currentQty", label: "Current" },
              { key: "threshold", label: "Threshold" },
              { key: "reorderQty", label: "Reorder Qty" },
            ]}
            data={data.lowStock}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Stock Movements</CardTitle></CardHeader>
        <CardContent>
          <ReportTable
            columns={[
              { key: "type", label: "Movement Type" },
              { key: "count", label: "Count" },
              { key: "totalQty", label: "Total Quantity" },
            ]}
            data={data.movementsByType}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Hours View ──────────────────────────────────────────────────────────

function HoursView({ data }: { data: HoursReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard label="Total Hours" value={data.totalHours.toFixed(1)} />
        <KPICard label="Verified Hours" value={data.totalVerified.toFixed(1)} />
        <KPICard label="Verification Rate" value={
          data.totalHours > 0 ? `${Math.round((data.totalVerified / data.totalHours) * 100)}%` : "N/A"
        } />
      </div>
      <Card>
        <CardHeader><CardTitle>Hours by Student</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="bar"
            data={data.byStudent}
            xKey="studentName"
            yKeys={[
              { key: "totalHours", color: "#8FADC8", name: "Total" },
              { key: "verifiedHours", color: "#C4AB70", name: "Verified" },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Weekly Trend</CardTitle></CardHeader>
        <CardContent>
          <ReportChart
            type="line"
            data={data.byWeek}
            xKey="weekStart"
            yKeys={[{ key: "hours", color: "#8FADC8", name: "Hours" }]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
        <CardContent>
          <ReportTable
            columns={[
              { key: "studentName", label: "Student" },
              { key: "totalHours", label: "Total Hours" },
              { key: "verifiedHours", label: "Verified" },
            ]}
            data={data.byStudent}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Build and verify**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npm run build 2>&1 | tail -20`

Expected: Build succeeds. Fix any type errors if they occur.

**Step 4: Commit**

```bash
git add src/app/app/reports/ src/components/reports/
git commit -m "feat(reports): add Reports page with all 5 report views, charts, and tables"
```

---

### Task 11: Verify the full build

**Step 1: Run a full build**

Run: `cd /Users/anabellelord/Opelle/opelle-app-github && npm run build 2>&1 | tail -30`

Expected: Build succeeds with no errors.

**Step 2: Fix any issues found**

If there are TypeScript errors or missing imports, fix them.

**Step 3: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "fix(reports): resolve build issues"
```

---

### Task 12: Visual verification

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Navigate to /app/reports in the browser**

Verify:
- The Reports page loads without errors
- The sidebar shows a "Reports" link with the BarChart3 icon
- Tabs switch between Revenue, Services, Clients, Inventory, Hours
- Date range picker changes the data period
- Charts render (even with empty data, they should show "No data for this period")
- Tables render correctly
- Export CSV button opens a download

**Step 3: Check browser console for errors**

No React errors, no fetch failures (may see 403 if not logged in, that's expected).
