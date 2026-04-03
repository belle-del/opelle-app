# Badges & Certificates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-awarded and instructor-awarded badges plus PDF certificate generation to complete Module 13 (Education & Certification).

**Architecture:** 4 new DB tables, a `checkAndAwardBadges` function hooked into clock-out and service completion flows, server-side PDF generation with jspdf stored in Supabase Storage, badge display in StudentProfilePanel, and 5 API endpoints. Default badges are seeded per workspace.

**Tech Stack:** Next.js App Router, Supabase (admin client), jspdf (PDF generation), Supabase Storage (certificate PDFs), Lucide icons, Opelle CSS custom properties

---

### Task 1: Install jspdf dependency

**Files:**
- Modify: `package.json`

**Step 1: Install jspdf**

```bash
npm install jspdf
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jspdf for certificate PDF generation"
```

---

### Task 2: Create database migration — 4 tables + RLS + seed badges

**Files:**
- Create: `supabase/migrations/014_badges_certificates.sql`

**Step 1: Write the migration**

```sql
-- ============================================================================
-- Module 13: Badges & Certificates — Tables, RLS, Indexes
-- ============================================================================

-- ─── Badge Definitions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria_type VARCHAR(30) NOT NULL CHECK (criteria_type IN ('hours_milestone', 'service_milestone', 'category_completion', 'custom')),
  criteria_value JSONB,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_workspace_owner" ON badges
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "badges_workspace_read" ON badges
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
CREATE INDEX idx_badges_workspace ON badges(workspace_id);

-- ─── Student Badges (earned) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id, badge_id)
);

ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sb_workspace_owner" ON student_badges
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "sb_student_read" ON student_badges
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM floor_status WHERE workspace_id = student_badges.workspace_id)
    AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE INDEX idx_sb_workspace ON student_badges(workspace_id);
CREATE INDEX idx_sb_student ON student_badges(workspace_id, student_id);

-- ─── Certificate Templates ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  template_html TEXT,
  requirements JSONB NOT NULL DEFAULT '{"hours": 1600}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_workspace_owner" ON certificates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_certs_workspace ON certificates(workspace_id);

-- ─── Student Certificates (issued) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id, certificate_id)
);

ALTER TABLE student_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_workspace_owner" ON student_certificates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "sc_student_read" ON student_certificates
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE INDEX idx_sc_workspace ON student_certificates(workspace_id);
CREATE INDEX idx_sc_student ON student_certificates(workspace_id, student_id);
```

**Step 2: Commit the migration file**

```bash
git add supabase/migrations/014_badges_certificates.sql
git commit -m "feat(badges): add badges, student_badges, certificates, student_certificates tables"
```

---

### Task 3: Add TypeScript types

**Files:**
- Modify: `src/lib/types.ts` (append at end)

**Step 1: Add types**

```typescript
// ─── Badges & Certificates Types ──────────────────────────────────────────

export type BadgeCriteriaType = 'hours_milestone' | 'service_milestone' | 'category_completion' | 'custom';

export type BadgeRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  criteria_type: BadgeCriteriaType;
  criteria_value: Record<string, unknown> | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type Badge2 = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  criteriaType: BadgeCriteriaType;
  criteriaValue: Record<string, unknown> | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export function badgeRowToModel(row: BadgeRow): Badge2 {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    criteriaType: row.criteria_type,
    criteriaValue: row.criteria_value,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
  };
}

export type StudentBadgeRow = {
  id: string;
  workspace_id: string;
  student_id: string;
  badge_id: string;
  earned_at: string;
  awarded_by: string | null;
  created_at: string;
};

export type StudentBadge = {
  id: string;
  workspaceId: string;
  studentId: string;
  badgeId: string;
  earnedAt: string;
  awardedBy: string | null;
  createdAt: string;
  badge?: Badge2;
};

export function studentBadgeRowToModel(row: StudentBadgeRow): StudentBadge {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    studentId: row.student_id,
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
    awardedBy: row.awarded_by,
    createdAt: row.created_at,
  };
}

export type StudentCertificateRow = {
  id: string;
  workspace_id: string;
  student_id: string;
  certificate_id: string;
  issued_at: string;
  certificate_url: string | null;
  created_at: string;
};

export type StudentCertificate = {
  id: string;
  workspaceId: string;
  studentId: string;
  certificateId: string;
  issuedAt: string;
  certificateUrl: string | null;
  createdAt: string;
};

export function studentCertificateRowToModel(row: StudentCertificateRow): StudentCertificate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    studentId: row.student_id,
    certificateId: row.certificate_id,
    issuedAt: row.issued_at,
    certificateUrl: row.certificate_url,
    createdAt: row.created_at,
  };
}
```

Note: Using `Badge2` to avoid collision with the existing `Badge` UI component from `@/components/ui/badge`.

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(badges): add Badge2, StudentBadge, StudentCertificate types"
```

---

### Task 4: Create DB helper functions + auto-award logic

**Files:**
- Create: `src/lib/db/badges.ts`

**Step 1: Write the DB helper**

This file contains:
- `listBadges(workspaceId)` — all active badges
- `listStudentBadges(workspaceId, studentId)` — student's earned badges with badge details
- `awardBadge(workspaceId, studentId, badgeId, awardedBy?)` — manually award
- `listStudentCertificates(workspaceId, studentId)` — student's certificates
- `seedDefaultBadges(workspaceId)` — create default badge set for a workspace
- `checkAndAwardBadges(workspaceId, studentId)` — the auto-award engine
- `generateCertificate(workspaceId, studentId, certificateId)` — PDF generation + storage

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Badge2, BadgeRow, StudentBadge, StudentBadgeRow, StudentCertificate, StudentCertificateRow,
} from "@/lib/types";
import { badgeRowToModel, studentBadgeRowToModel, studentCertificateRowToModel } from "@/lib/types";

// ─── Badge CRUD ───────────────────────────────────────────────────────────

export async function listBadges(workspaceId: string): Promise<Badge2[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("badges")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as BadgeRow[]).map(badgeRowToModel);
}

export async function listStudentBadges(workspaceId: string, studentId: string): Promise<(StudentBadge & { badge: Badge2 })[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("student_badges")
    .select("*, badges(*)")
    .eq("workspace_id", workspaceId)
    .eq("student_id", studentId)
    .order("earned_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => ({
    ...studentBadgeRowToModel(row as StudentBadgeRow),
    badge: badgeRowToModel(row.badges as BadgeRow),
  }));
}

export async function awardBadge(input: {
  workspaceId: string;
  studentId: string;
  badgeId: string;
  awardedBy?: string;
}): Promise<StudentBadge | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("student_badges")
    .upsert({
      workspace_id: input.workspaceId,
      student_id: input.studentId,
      badge_id: input.badgeId,
      earned_at: new Date().toISOString(),
      awarded_by: input.awardedBy || null,
    }, { onConflict: "workspace_id,student_id,badge_id" })
    .select("*")
    .single();

  if (error || !data) return null;
  return studentBadgeRowToModel(data as StudentBadgeRow);
}

// ─── Certificates ─────────────────────────────────────────────────────────

export async function listStudentCertificates(workspaceId: string, studentId: string): Promise<StudentCertificate[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("student_certificates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });

  if (error || !data) return [];
  return (data as StudentCertificateRow[]).map(studentCertificateRowToModel);
}

// ─── Seed Default Badges ──────────────────────────────────────────────────

export async function seedDefaultBadges(workspaceId: string): Promise<number> {
  const admin = createSupabaseAdminClient();

  // Check if badges already exist for this workspace
  const { count } = await admin
    .from("badges")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if ((count ?? 0) > 0) return 0;

  const defaults = [
    { name: "100 Hour Club", description: "Completed 100 clinic hours", criteria_type: "hours_milestone", criteria_value: { hours: 100 }, sort_order: 1 },
    { name: "500 Hour Club", description: "Completed 500 clinic hours", criteria_type: "hours_milestone", criteria_value: { hours: 500 }, sort_order: 2 },
    { name: "1000 Hour Club", description: "Completed 1000 clinic hours", criteria_type: "hours_milestone", criteria_value: { hours: 1000 }, sort_order: 3 },
    { name: "1600 Hours Complete", description: "Completed all required clinic hours", criteria_type: "hours_milestone", criteria_value: { hours: 1600 }, sort_order: 4 },
    { name: "First Service", description: "Completed first client service", criteria_type: "service_milestone", criteria_value: { count: 1 }, sort_order: 5 },
    { name: "50 Services", description: "Completed 50 client services", criteria_type: "service_milestone", criteria_value: { count: 50 }, sort_order: 6 },
    { name: "100 Services", description: "Completed 100 client services", criteria_type: "service_milestone", criteria_value: { count: 100 }, sort_order: 7 },
  ];

  const rows = defaults.map((d) => ({ workspace_id: workspaceId, ...d }));
  const { error } = await admin.from("badges").insert(rows);
  return error ? 0 : defaults.length;
}

// ─── Auto-Award Engine ────────────────────────────────────────────────────

export async function checkAndAwardBadges(workspaceId: string, studentId: string): Promise<string[]> {
  const admin = createSupabaseAdminClient();

  // Seed default badges if none exist
  await seedDefaultBadges(workspaceId);

  // Fetch all active badges + student's already-earned badges in parallel
  const [badgesResult, earnedResult, totalsResult, completionsCount, progressResult] = await Promise.all([
    admin.from("badges").select("*").eq("workspace_id", workspaceId).eq("active", true),
    admin.from("student_badges").select("badge_id").eq("workspace_id", workspaceId).eq("student_id", studentId),
    admin.from("hour_totals").select("total_hours").eq("workspace_id", workspaceId).eq("student_id", studentId).single(),
    admin.from("service_completions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("student_id", studentId),
    admin.from("curriculum_progress").select("category_id, completed_count").eq("workspace_id", workspaceId).eq("student_id", studentId),
  ]);

  const allBadges = (badgesResult.data || []) as BadgeRow[];
  const earnedIds = new Set((earnedResult.data || []).map((e: any) => e.badge_id));
  const totalHours = Number(totalsResult.data?.total_hours) || 0;
  const totalServices = completionsCount.count ?? 0;

  // Build category completion map
  const categoryProgress: Record<string, number> = {};
  for (const p of (progressResult.data || [])) {
    categoryProgress[p.category_id as string] = (p.completed_count as number) || 0;
  }

  // Also fetch category requirements for category_completion badges
  const { data: categories } = await admin
    .from("service_categories")
    .select("id, code, required_count")
    .eq("workspace_id", workspaceId)
    .eq("active", true);

  const categoryRequirements: Record<string, { code: string; required: number }> = {};
  for (const c of (categories || [])) {
    categoryRequirements[c.id as string] = {
      code: c.code as string,
      required: (c.required_count as number) || 0,
    };
  }

  const newlyAwarded: string[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.criteria_type === "custom") continue;

    const cv = badge.criteria_value as Record<string, unknown> | null;
    if (!cv) continue;

    let earned = false;

    switch (badge.criteria_type) {
      case "hours_milestone":
        earned = totalHours >= (Number(cv.hours) || Infinity);
        break;
      case "service_milestone":
        earned = totalServices >= (Number(cv.count) || Infinity);
        break;
      case "category_completion": {
        const targetCode = cv.category_code as string;
        if (targetCode) {
          // Find category by code
          for (const [catId, meta] of Object.entries(categoryRequirements)) {
            if (meta.code === targetCode && meta.required > 0) {
              earned = (categoryProgress[catId] || 0) >= meta.required;
              break;
            }
          }
        }
        break;
      }
    }

    if (earned) {
      const result = await awardBadge({ workspaceId, studentId, badgeId: badge.id });
      if (result) newlyAwarded.push(badge.name);
    }
  }

  // Check if 1600-hour badge was just awarded → auto-generate certificate
  if (newlyAwarded.includes("1600 Hours Complete")) {
    // Check for certificate template
    const { data: certTemplate } = await admin
      .from("certificates")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .limit(1)
      .single();

    if (certTemplate) {
      // Certificate generation is fire-and-forget
      generateAndStoreCertificate(workspaceId, studentId, certTemplate.id).catch(() => {});
    }
  }

  return newlyAwarded;
}

// ─── Certificate PDF Generation ───────────────────────────────────────────

export async function generateAndStoreCertificate(
  workspaceId: string,
  studentId: string,
  certificateId: string
): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  // Check if already issued
  const { data: existing } = await admin
    .from("student_certificates")
    .select("certificate_url")
    .eq("workspace_id", workspaceId)
    .eq("student_id", studentId)
    .eq("certificate_id", certificateId)
    .single();

  if (existing?.certificate_url) return existing.certificate_url;

  // Fetch student + workspace + certificate info
  const [studentResult, workspaceResult, certResult, hoursResult] = await Promise.all([
    admin.from("floor_status").select("student_name").eq("workspace_id", workspaceId).eq("student_id", studentId).single(),
    admin.from("workspaces").select("name").eq("id", workspaceId).single(),
    admin.from("certificates").select("name, template_html").eq("id", certificateId).single(),
    admin.from("hour_totals").select("total_hours").eq("workspace_id", workspaceId).eq("student_id", studentId).single(),
  ]);

  const studentName = studentResult.data?.student_name || "Student";
  const schoolName = workspaceResult.data?.name || "School";
  const certName = certResult.data?.name || "Certificate of Completion";
  const totalHours = Number(hoursResult.data?.total_hours) || 0;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Generate PDF with jspdf
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(241, 239, 224); // CREAM
  doc.rect(0, 0, w, h, "F");

  // Border
  doc.setDrawColor(196, 171, 112); // BRASS
  doc.setLineWidth(3);
  doc.rect(30, 30, w - 60, h - 60);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);

  // School name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(138, 127, 110); // TEXT_FAINT
  doc.text(schoolName.toUpperCase(), w / 2, 90, { align: "center" });

  // Certificate title
  doc.setFontSize(36);
  doc.setTextColor(44, 36, 22); // TEXT_MAIN
  doc.text(certName, w / 2, 150, { align: "center" });

  // "This certifies that"
  doc.setFontSize(14);
  doc.setTextColor(138, 127, 110);
  doc.text("This certifies that", w / 2, 200, { align: "center" });

  // Student name
  doc.setFontSize(32);
  doc.setTextColor(107, 39, 55); // GARNET
  doc.text(studentName, w / 2, 250, { align: "center" });

  // Line under name
  doc.setDrawColor(196, 171, 112);
  doc.setLineWidth(1);
  doc.line(w / 2 - 150, 265, w / 2 + 150, 265);

  // Completion text
  doc.setFontSize(14);
  doc.setTextColor(44, 36, 22);
  doc.text(
    `has successfully completed ${totalHours.toFixed(0)} hours of cosmetology training`,
    w / 2, 310, { align: "center" }
  );

  // Date
  doc.setFontSize(12);
  doc.setTextColor(138, 127, 110);
  doc.text(`Issued on ${dateStr}`, w / 2, 360, { align: "center" });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  // Upload to Supabase Storage
  const storagePath = `${workspaceId}/${studentId}/${certificateId}.pdf`;

  // Create bucket if needed (ignore error if exists)
  await admin.storage.createBucket("certificates", { public: true }).catch(() => {});

  const { error: uploadError } = await admin.storage
    .from("certificates")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Certificate upload error:", uploadError.message);
    return null;
  }

  const { data: urlData } = admin.storage.from("certificates").getPublicUrl(storagePath);
  const certificateUrl = urlData.publicUrl;

  // Insert student_certificates record
  await admin.from("student_certificates").upsert({
    workspace_id: workspaceId,
    student_id: studentId,
    certificate_id: certificateId,
    issued_at: new Date().toISOString(),
    certificate_url: certificateUrl,
  }, { onConflict: "workspace_id,student_id,certificate_id" });

  return certificateUrl;
}
```

**Step 2: Commit**

```bash
git add src/lib/db/badges.ts
git commit -m "feat(badges): add DB helpers, auto-award engine, certificate PDF generation"
```

---

### Task 5: Create API routes (5 endpoints)

**Files:**
- Create: `src/app/api/badges/route.ts`
- Create: `src/app/api/students/[id]/badges/route.ts`
- Create: `src/app/api/students/[id]/certificates/route.ts`
- Create: `src/app/api/certificates/generate/route.ts`

**Step 1: GET /api/badges — list workspace badges**

File: `src/app/api/badges/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listBadges, seedDefaultBadges } from "@/lib/db/badges";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Seed defaults if needed
    await seedDefaultBadges(workspaceId);

    const badges = await listBadges(workspaceId);
    return NextResponse.json({ badges });
  } catch (err) {
    console.error("List badges error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: GET + POST /api/students/[id]/badges**

File: `src/app/api/students/[id]/badges/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listStudentBadges, awardBadge } from "@/lib/db/badges";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const badges = await listStudentBadges(workspaceId, studentId);
    return NextResponse.json({ badges });
  } catch (err) {
    console.error("Student badges error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const { badge_id } = await req.json();

    if (!badge_id) {
      return NextResponse.json({ error: "badge_id required" }, { status: 400 });
    }

    const result = await awardBadge({
      workspaceId,
      studentId,
      badgeId: badge_id,
      awardedBy: user.id,
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to award badge" }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Award badge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: GET /api/students/[id]/certificates**

File: `src/app/api/students/[id]/certificates/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listStudentCertificates } from "@/lib/db/badges";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const certificates = await listStudentCertificates(workspaceId, studentId);
    return NextResponse.json({ certificates });
  } catch (err) {
    console.error("Student certificates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: POST /api/certificates/generate**

File: `src/app/api/certificates/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { generateAndStoreCertificate } from "@/lib/db/badges";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { student_id, certificate_id } = await req.json();
    if (!student_id || !certificate_id) {
      return NextResponse.json({ error: "student_id and certificate_id required" }, { status: 400 });
    }

    const url = await generateAndStoreCertificate(workspaceId, student_id, certificate_id);
    if (!url) {
      return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
    }

    return NextResponse.json({ certificateUrl: url }, { status: 201 });
  } catch (err) {
    console.error("Certificate generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 5: Commit all API routes**

```bash
git add src/app/api/badges/ src/app/api/students/ src/app/api/certificates/
git commit -m "feat(badges): add 5 API routes for badges and certificates"
```

---

### Task 6: Hook auto-award into clock-out and service completion

**Files:**
- Modify: `src/app/api/floor/clock-out/route.ts:102-108`
- Modify: `src/app/api/services/complete/route.ts:193-197`

**Step 1: Add to clock-out route**

After line 101 (closing brace of the `if (openEntry)` block), before the return statement, add:

```typescript
    // Auto-award badges (fire-and-forget)
    import("@/lib/db/badges").then(({ checkAndAwardBadges }) => {
      checkAndAwardBadges(workspaceId, studentId).catch(() => {});
    });
```

**Step 2: Add to service completion route**

After the kernel event publish (around line 197), before the marketing automation block, add:

```typescript
    // Auto-award badges (fire-and-forget)
    import("@/lib/db/badges").then(({ checkAndAwardBadges }) => {
      checkAndAwardBadges(workspaceId, studentId).catch(() => {});
    });
```

Using dynamic import so it's non-blocking and doesn't add to the critical path.

**Step 3: Commit**

```bash
git add src/app/api/floor/clock-out/route.ts src/app/api/services/complete/route.ts
git commit -m "feat(badges): hook auto-award into clock-out and service completion"
```

---

### Task 7: Add badges to student API response

**Files:**
- Modify: `src/app/api/student/[studentId]/route.ts`

**Step 1: Add badge + certificate queries to the Promise.all**

Add two more queries to the existing Promise.all (after `earningsResult`):

```typescript
    badgesResult,
    certificatesResult,
```

The new queries:

```typescript
      admin.from("student_badges")
        .select("id, badge_id, earned_at, awarded_by, badges(name, description, image_url, criteria_type)")
        .eq("workspace_id", workspaceId).eq("student_id", studentId)
        .order("earned_at", { ascending: false }),

      admin.from("student_certificates")
        .select("id, certificate_id, issued_at, certificate_url")
        .eq("workspace_id", workspaceId).eq("student_id", studentId)
        .order("issued_at", { ascending: false }),
```

Add to the response JSON:

```typescript
      badges: (badgesResult.data || []).map((b: any) => ({
        id: b.id,
        badgeId: b.badge_id,
        earnedAt: b.earned_at,
        awardedBy: b.awarded_by,
        name: b.badges?.name || "Badge",
        description: b.badges?.description || "",
        imageUrl: b.badges?.image_url,
        criteriaType: b.badges?.criteria_type,
      })),
      certificates: (certificatesResult.data || []).map((c: any) => ({
        id: c.id,
        certificateId: c.certificate_id,
        issuedAt: c.issued_at,
        certificateUrl: c.certificate_url,
      })),
```

**Step 2: Commit**

```bash
git add src/app/api/student/[studentId]/route.ts
git commit -m "feat(badges): include badges and certificates in student API response"
```

---

### Task 8: Add badges section to StudentProfilePanel

**Files:**
- Modify: `src/app/app/floor/_components/StudentProfilePanel.tsx`

**Step 1: Add badge and certificate interfaces**

Add to the existing interfaces (after `Earnings`):

```typescript
interface EarnedBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  awardedBy: string | null;
  name: string;
  description: string;
  imageUrl: string | null;
  criteriaType: string;
}

interface EarnedCertificate {
  id: string;
  certificateId: string;
  issuedAt: string;
  certificateUrl: string | null;
}
```

Update `StudentData` interface to add:

```typescript
  badges: EarnedBadge[];
  certificates: EarnedCertificate[];
```

**Step 2: Add Award and Star imports**

Update the Lucide import:

```typescript
import { X, Clock, CheckCircle, GraduationCap, DollarSign, Award, Star, Download } from "lucide-react";
```

**Step 3: Add Badges section after Curriculum Progress (after line 316)**

```tsx
            {/* Badges */}
            {data.badges && data.badges.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500,
                  color: TEXT_MAIN, margin: "0 0 12px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Award size={16} /> Badges Earned
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                  {data.badges.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: STONE, borderRadius: 10, padding: 12,
                        textAlign: "center",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: BRASS, display: "flex", alignItems: "center",
                        justifyContent: "center", margin: "0 auto 8px",
                      }}>
                        <Star size={18} color="#fff" fill="#fff" />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_MAIN, margin: "0 0 2px" }}>
                        {b.name}
                      </p>
                      <p style={{ fontSize: 9, color: TEXT_FAINT, margin: 0 }}>
                        {new Date(b.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {data.certificates && data.certificates.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500,
                  color: TEXT_MAIN, margin: "0 0 12px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <GraduationCap size={16} /> Certificates
                </h3>
                {data.certificates.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", background: STONE, borderRadius: 8, marginBottom: 4,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: TEXT_MAIN, margin: 0 }}>
                        Completion Certificate
                      </p>
                      <p style={{ fontSize: 10, color: TEXT_FAINT, margin: "2px 0 0" }}>
                        Issued {new Date(c.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {c.certificateUrl && (
                      <a
                        href={c.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6,
                          background: BRASS, color: "#fff",
                          fontSize: 10, fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
```

**Step 4: Commit**

```bash
git add src/app/app/floor/_components/StudentProfilePanel.tsx
git commit -m "feat(badges): display badges and certificates in StudentProfilePanel"
```

---

### Task 9: Push to GitHub + apply migration

**Step 1: Push**

```bash
git push origin HEAD
```

**Step 2: Apply migration SQL**

Run `supabase/migrations/014_badges_certificates.sql` in the Supabase dashboard SQL editor.

**Step 3: Create a default certificate template**

After tables are created, insert a default certificate template via the SQL editor:

```sql
INSERT INTO certificates (workspace_id, name, requirements)
SELECT id, 'Cosmetology Completion Certificate', '{"hours": 1600}'
FROM workspaces
LIMIT 1;
```

**Step 4: Verify on live site**

- Open a student profile from the Floor view
- Badges section should appear (auto-seeded on first API call)
- Clock out a student → check if badges are auto-awarded
- Complete a service → check if badges are auto-awarded
- If student has 1600+ hours → certificate should auto-generate
