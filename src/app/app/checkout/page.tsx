import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "./_components/CheckoutFlow";

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/app");

  const admin = createSupabaseAdminClient();

  const [studentsResult, categoriesResult, clientsResult] = await Promise.all([
    admin.from("floor_status").select("student_id, student_name")
      .eq("workspace_id", workspaceId).order("student_name", { ascending: true }),
    admin.from("service_categories").select("id, name, requires_photos")
      .eq("workspace_id", workspaceId).eq("active", true).order("sort_order", { ascending: true }),
    admin.from("clients").select("id, first_name, last_name")
      .eq("workspace_id", workspaceId).order("first_name", { ascending: true }),
  ]);

  const students = (studentsResult.data || []).map((s: Record<string, unknown>) => ({
    studentId: s.student_id as string,
    studentName: s.student_name as string,
  }));

  const categories = (categoriesResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    requires_photos: c.requires_photos as boolean,
  }));

  const clients = (clientsResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
  }));

  return <CheckoutFlow students={students} categories={categories} clients={clients} />;
}
