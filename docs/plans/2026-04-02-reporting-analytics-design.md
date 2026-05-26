# Reporting & Analytics — Design Doc

**Date:** 2026-04-02
**Module:** Build Bible Module 10
**Status:** Design

---

## Overview

Add a reporting dashboard to Opelle at `/app/reports` with five report types: Revenue, Services, Clients, Inventory, and Hours. Reports query existing tables directly (no pre-aggregation needed at current scale). Charts via Recharts. CSV export on every report.

---

## Data Sources

| Report | Primary Tables | Key Columns |
|--------|---------------|-------------|
| Revenue | `student_earnings` | service_amount, tip_amount, service_category, created_at |
| Services | `service_completions` + `appointments` + `service_categories` | service_category_id, completed_at, stylist_id, client_id |
| Clients | `clients` + `appointments` | created_at (first visit proxy), status=completed, client_id |
| Inventory | `products` + `stock_movements` + `stock_alerts` | quantity, low_stock_threshold, movement_type, quantity_change |
| Hours | `time_entries` + `hour_totals` | clock_in, clock_out, duration_minutes, total_hours, verified_hours |

---

## API Endpoints

All endpoints require authenticated workspace member. All accept `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. All accept `?format=csv` for export.

### GET /api/reports/revenue
Query params: `start_date`, `end_date`, `student_id` (optional filter)
Response:
```json
{
  "total_revenue": 4250.00,
  "total_services": 3800.00,
  "total_tips": 450.00,
  "by_day": [{ "date": "2026-03-01", "revenue": 150.00, "tips": 20.00 }],
  "by_category": [{ "category": "Color", "revenue": 2100.00, "count": 28 }],
  "by_student": [{ "student_id": "...", "student_name": "...", "revenue": 1200.00 }]
}
```

### GET /api/reports/services
Query params: `start_date`, `end_date`, `student_id`, `category_id`
Response:
```json
{
  "total_completed": 85,
  "total_cancelled": 5,
  "by_category": [{ "category": "Color", "count": 35, "avg_duration_mins": 120 }],
  "by_student": [{ "student_name": "...", "completed": 22 }],
  "by_day": [{ "date": "2026-03-01", "completed": 3, "cancelled": 0 }]
}
```

### GET /api/reports/clients
Query params: `start_date`, `end_date`
Response:
```json
{
  "total_clients": 120,
  "new_clients": 15,
  "returning_clients": 45,
  "retention_rate": 0.72,
  "avg_visits": 3.2,
  "avg_lifetime_value": 285.00,
  "by_month": [{ "month": "2026-03", "new": 8, "returning": 22 }]
}
```
- **New:** first appointment within date range
- **Returning:** had appointment before date range AND within date range
- **Retention rate:** clients with 2+ completed appointments / total clients
- **LTV:** total earnings per client (from student_earnings joined via appointments)

### GET /api/reports/inventory
Query params: `start_date`, `end_date`
Response:
```json
{
  "total_products": 85,
  "low_stock_count": 12,
  "out_of_stock_count": 3,
  "total_usage_value": 450.00,
  "top_used": [{ "product_name": "...", "brand": "...", "usage_count": 15, "usage_value": 45.00 }],
  "low_stock": [{ "product_name": "...", "current_qty": 2, "threshold": 5, "reorder_qty": 10 }],
  "movements_by_type": [{ "type": "service_deduct", "count": 120, "total_qty": 350 }]
}
```

### GET /api/reports/hours
Query params: `start_date`, `end_date`, `student_id`
Response:
```json
{
  "total_hours": 1250.5,
  "total_verified": 1100.0,
  "by_student": [{ "student_id": "...", "student_name": "...", "total_hours": 280, "verified_hours": 260 }],
  "by_week": [{ "week_start": "2026-03-01", "hours": 42.5 }]
}
```

---

## Permissions

Uses existing `permissions.ts` role system:

| Role | Revenue | Services | Clients | Inventory | Hours |
|------|---------|----------|---------|-----------|-------|
| owner/admin | All data | All data | All data | All data | All data |
| instructor | All students | All students | Read-only | Read-only | All students |
| stylist | Own only | Own only | Own clients | No access | Own only |
| student | Own only | Own only | Own clients | No access | Own only |
| front_desk | No access | No access | No access | No access | No access |

Permission check: `getCurrentWorkspace()` + `workspace_members` role lookup. Filter queries by `user_id` for non-admin roles.

---

## UI Structure

### Page: /app/reports/page.tsx

```
ReportsPage
├── ReportTypeTabs (Revenue | Services | Clients | Inventory | Hours)
├── FilterBar
│   ├── DateRangePicker (preset: Today, This Week, This Month, Last 30 Days, Custom)
│   ├── StudentFilter (dropdown, admin/instructor only)
│   └── ExportCSVButton
├── KPICards (4 summary cards per report type)
├── MainChart (Recharts — LineChart for trends, BarChart for breakdowns)
└── DataTable (sortable rows, scrollable)
```

### Components

- `ReportTypeTabs` — tab switcher at top
- `DateRangePicker` — preset buttons + custom date inputs
- `KPICard` — number + label + optional change indicator
- `ReportChart` — wrapper around Recharts (LineChart, BarChart, PieChart)
- `ReportTable` — sortable data table with columns config
- `ExportButton` — triggers `?format=csv` download

### Chart assignments

| Report | Main Chart | Secondary |
|--------|-----------|-----------|
| Revenue | LineChart (daily revenue trend) | BarChart (by category) |
| Services | BarChart (by category) | LineChart (daily completions) |
| Clients | LineChart (new vs returning by month) | — |
| Inventory | BarChart (top used products) | — |
| Hours | BarChart (by student) | LineChart (weekly trend) |

---

## File Structure

```
src/
├── app/
│   ├── app/reports/
│   │   └── page.tsx                    # Reports page (server component + client islands)
│   └── api/reports/
│       ├── revenue/route.ts
│       ├── services/route.ts
│       ├── clients/route.ts
│       ├── inventory/route.ts
│       └── hours/route.ts
├── lib/
│   └── db/
│       └── reports.ts                  # All report query functions
└── components/
    └── reports/
        ├── ReportsPage.tsx             # Client component (tabs, state, fetching)
        ├── DateRangePicker.tsx
        ├── KPICard.tsx
        ├── ReportChart.tsx             # Recharts wrapper
        ├── ReportTable.tsx
        └── ExportButton.tsx
```

---

## Migration

No new tables needed. All queries run against existing tables.

If query performance becomes an issue later, add `daily_metrics` + `daily_stylist_metrics` as described in Build Bible Module 10 and populate via a nightly cron job at `/api/cron/aggregate-metrics`.

---

## CSV Export

Each API route checks `format` query param. When `format=csv`:
- Set `Content-Type: text/csv` and `Content-Disposition: attachment; filename=revenue-report-2026-04-02.csv`
- Stream rows as CSV (no JSON wrapper)
- Same permission checks apply

---

## Out of Scope (YAGNI)

- Saved reports / custom report builder
- Cohort retention matrix (insufficient historical data)
- Labor cost % / payroll integration (no payroll tables yet)
- AI-powered forecasting (future Kernel integration)
- Pre-aggregated daily_metrics tables (add when needed for perf)
