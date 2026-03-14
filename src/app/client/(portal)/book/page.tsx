import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceSelector } from "./_components/ServiceSelector";

export default async function BookPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const supabase = await createSupabaseServerClient();

  // Get service types with booking_type set
  const { data: serviceTypes } = await supabase
    .from("service_types")
    .select("*")
    .eq("workspace_id", ctx.clientUser.workspaceId)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <h1
        className="text-xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        Book an Appointment
      </h1>

      <ServiceSelector
        serviceTypes={(serviceTypes || []).map(st => ({
          id: st.id,
          name: st.name,
          durationMins: st.default_duration_mins || 60,
          bookingType: st.booking_type || "request",
        }))}
      />
    </div>
  );
}
