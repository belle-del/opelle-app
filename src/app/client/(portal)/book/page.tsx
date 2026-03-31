import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceSelector } from "./_components/ServiceSelector";

export default async function BookPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  if (!ctx.client.permissions?.can_self_book) {
    return (
      <div className="space-y-5">
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24" }}>
          Book an Appointment
        </h1>
        <Card style={{ border: "1px dashed #E8E0D0" }}>
          <CardContent className="py-8 text-center">
            <p style={{ fontSize: "14px", color: "#7A7A72", fontFamily: "'Cormorant Garamond', serif" }}>
              Your stylist manages this for you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const admin = createSupabaseAdminClient();

  // Get service types with booking_type set
  const { data: serviceTypes } = await admin
    .from("service_types")
    .select("*")
    .eq("workspace_id", ctx.clientUser.workspaceId)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <h1
        style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24" }}
      >
        Book an Appointment
      </h1>

      <ServiceSelector
        serviceTypes={(serviceTypes || []).map(st => ({
          id: st.id,
          name: st.name,
          durationMins: st.duration_minutes || 60,
          bookingType: st.booking_type || "request",
        }))}
        clientId={ctx.clientUser.clientId}
        workspaceId={ctx.clientUser.workspaceId}
      />
    </div>
  );
}
