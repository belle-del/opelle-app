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
  return data.map((row) => ({
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
  const earnedIds = new Set((earnedResult.data || []).map((e) => (e as { badge_id: string }).badge_id));
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
    const { data: certTemplate } = await admin
      .from("certificates")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .limit(1)
      .single();

    if (certTemplate) {
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
  doc.setFillColor(241, 239, 224);
  doc.rect(0, 0, w, h, "F");

  // Border
  doc.setDrawColor(196, 171, 112);
  doc.setLineWidth(3);
  doc.rect(30, 30, w - 60, h - 60);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);

  // School name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(138, 127, 110);
  doc.text(schoolName.toUpperCase(), w / 2, 90, { align: "center" });

  // Certificate title
  doc.setFontSize(36);
  doc.setTextColor(44, 36, 22);
  doc.text(certName, w / 2, 150, { align: "center" });

  // "This certifies that"
  doc.setFontSize(14);
  doc.setTextColor(138, 127, 110);
  doc.text("This certifies that", w / 2, 200, { align: "center" });

  // Student name
  doc.setFontSize(32);
  doc.setTextColor(107, 39, 55);
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
