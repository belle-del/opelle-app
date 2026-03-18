import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceTypesManager } from "./_components/ServiceTypesManager";
import { StylistCodeBlock } from "./_components/StylistCodeBlock";
import { BookingConfig } from "./_components/BookingConfig";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserIdFromMiddleware } from "@/lib/supabase/get-user-from-middleware";

export default async function SettingsPage() {
  const userId = await getUserIdFromMiddleware();

  const admin = createSupabaseAdminClient();
  const { data: workspace } = await admin
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .single();

  // Get user info for display
  const { data: { user } } = userId
    ? await admin.auth.admin.getUserById(userId)
    : { data: { user: null } };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--text-on-stone-faint)", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
          Account
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 400, color: "var(--text-on-stone)", letterSpacing: "-0.01em" }}>Settings</h2>
        <p style={{ fontSize: 12, color: "var(--text-on-stone-faint)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
          Manage your account and preferences.
        </p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium" style={{ background: "var(--garnet-deep)", color: "var(--garnet-blush)", fontFamily: "'Fraunces', serif" }}>
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-medium text-lg">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Your studio settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Workspace Name</p>
            <p className="text-lg">{workspace?.name || "My Studio"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Workspace ID</p>
            <p className="text-sm font-mono text-muted-foreground">{workspace?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
          <CardDescription>Manage the service types available when logging formulas</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceTypesManager workspaceId={workspace?.id} />
        </CardContent>
      </Card>

      {/* Booking Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Configuration</CardTitle>
          <CardDescription>Configure how clients can book appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingConfig
            workspaceId={workspace?.id}
            initialBookingWindow={workspace?.booking_window_days ?? 60}
            initialBufferMinutes={workspace?.buffer_minutes ?? 0}
            initialWorkingHours={workspace?.working_hours ?? {}}
          />
        </CardContent>
      </Card>

      {/* Client Portal */}
      <Card>
        <CardHeader>
          <CardTitle>Client Portal</CardTitle>
          <CardDescription>Share your code so clients can connect with you</CardDescription>
        </CardHeader>
        <CardContent>
          <StylistCodeBlock
            workspaceId={workspace?.id}
            initialCode={workspace?.stylist_code || null}
          />
        </CardContent>
      </Card>

      {/* Data Export Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Export your data for backup or transfer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--stone-mid)" }}>
            <p style={{ color: "var(--text-on-stone-faint)", marginBottom: 8, fontSize: 12 }}>Coming Soon</p>
            <p style={{ fontSize: 11, color: "var(--text-on-stone-faint)" }}>
              Export your clients, appointments, and formulas to CSV or JSON.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card style={{ borderColor: "rgba(117,18,18,0.2)" }}>
        <CardHeader>
          <CardTitle style={{ color: "var(--status-low)" }}>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "rgba(117,18,18,0.2)" }}>
            <p style={{ color: "var(--text-on-stone-faint)", marginBottom: 8, fontSize: 12 }}>Account Deletion</p>
            <p style={{ fontSize: 11, color: "var(--text-on-stone-faint)" }}>
              Contact support to delete your account and all associated data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
