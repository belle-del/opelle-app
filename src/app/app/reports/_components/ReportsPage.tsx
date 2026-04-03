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
              keyField="studentId"
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
            keyField="studentId"
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
            keyField="productId"
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
            keyField="type"
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
            keyField="studentId"
          />
        </CardContent>
      </Card>
    </div>
  );
}
