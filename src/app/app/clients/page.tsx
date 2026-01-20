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
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Manage
          </p>
          <h2 className="text-3xl font-semibold">Clients</h2>
          <p className="text-muted-foreground">
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
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No clients yet</h3>
            <p className="text-muted-foreground mb-6">
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
              <Card className="hover:bg-white/10 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-black font-medium">
                        {client.firstName[0]}
                        {client.lastName?.[0] || ""}
                      </div>
                      <div>
                        <p className="font-medium">{getClientDisplayName(client)}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {client.email && <span>{client.email}</span>}
                          {client.phone && client.email && <span>•</span>}
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
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        Added {formatDate(client.createdAt)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
