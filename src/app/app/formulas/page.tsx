import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listFormulas } from "@/lib/db/formulas";
import { listClients } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, FlaskConical, ChevronRight } from "lucide-react";

export default async function FormulasPage() {
  const [formulas, clients] = await Promise.all([
    listFormulas(),
    listClients(),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const serviceTypeLabels: Record<string, string> = {
    color: "Color",
    lighten: "Lightener",
    tone: "Toner",
    gloss: "Gloss",
    other: "Other",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Library
          </p>
          <h2 className="text-3xl font-semibold">Formulas</h2>
          <p className="text-muted-foreground">
            {formulas.length} {formulas.length === 1 ? "formula" : "formulas"} saved
          </p>
        </div>
        <Link href="/app/formulas/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Formula
          </Button>
        </Link>
      </header>

      {formulas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No formulas yet</h3>
            <p className="text-muted-foreground mb-6">
              Save your color formulas to reference later.
            </p>
            <Link href="/app/formulas/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Formula
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {formulas.map((formula) => {
            const client = formula.clientId ? clientMap.get(formula.clientId) : null;
            return (
              <Link key={formula.id} href={`/app/formulas/${formula.id}`}>
                <Card className="hover:bg-white/10 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium">{formula.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formula.colorLine || "No color line"}
                            {client && ` • ${getClientDisplayName(client)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {serviceTypeLabels[formula.serviceType] || formula.serviceType}
                        </Badge>
                        {formula.tags.length > 0 && (
                          <div className="hidden md:flex items-center gap-1">
                            {formula.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground hidden sm:block">
                          {formatDate(formula.createdAt)}
                        </span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
