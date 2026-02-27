import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listClients } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, User, ChevronRight } from "lucide-react";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)", marginBottom: "4px" }}>
            Manage
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--text-on-bark)", fontWeight: 300 }}>
            Clients
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-on-bark-faint)", marginTop: "4px" }}>
            {clients.length} {clients.length === 1 ? "client" : "clients"} in your studio
          </p>
        </div>
        <Link href="/app/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </Link>
      </header>

      {/* Client List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-on-stone-ghost)" }} />
            <h3 style={{ fontSize: "14px", fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)", fontWeight: 400, marginBottom: "8px" }}>No clients yet</h3>
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "16px" }}>
              Add your first client to start tracking their journey.
            </p>
            <Link href="/app/clients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/app/clients/${client.id}`}>
              <Card className="cursor-pointer" style={{ marginBottom: "8px" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center font-medium"
                        style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          background: "var(--garnet-deep)", color: "var(--garnet-blush)",
                          fontSize: "11px",
                        }}
                      >
                        {client.firstName[0]}
                        {client.lastName?.[0] || ""}
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>{getClientDisplayName(client)}</p>
                        <div className="flex items-center gap-2" style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                          {client.email && <span>{client.email}</span>}
                          {client.phone && client.email && <span>·</span>}
                          {client.phone && <span>{client.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {client.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                          {client.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                          {client.tags.length > 2 && (
                            <Badge variant="outline">+{client.tags.length - 2}</Badge>
                          )}
                        </div>
                      )}
                      <span className="hidden sm:block" style={{ fontSize: "9px", color: "var(--brass)" }}>
                        {formatDate(client.createdAt)}
                      </span>
                      <ChevronRight className="w-4 h-4" style={{ color: "var(--text-on-stone-ghost)" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
