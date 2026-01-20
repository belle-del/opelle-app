import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user?.id)
    .single();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Account
        </p>
        <h2 className="text-3xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-2xl font-medium text-black">
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

      {/* Data Export Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Export your data for backup or transfer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
            <p className="text-muted-foreground mb-2">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Export your clients, appointments, and formulas to CSV or JSON.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-red-500/20 p-8 text-center">
            <p className="text-muted-foreground mb-2">Account Deletion</p>
            <p className="text-sm text-muted-foreground">
              Contact support to delete your account and all associated data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
