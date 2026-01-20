import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFormula } from "@/lib/db/formulas";
import { getClient } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, User, Beaker } from "lucide-react";
import { FormulaActions } from "./_components/FormulaActions";

interface FormulaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FormulaDetailPage({ params }: FormulaDetailPageProps) {
  const { id } = await params;
  const formula = await getFormula(id);

  if (!formula) {
    notFound();
  }

  const client = formula.clientId ? await getClient(formula.clientId) : null;

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
      <header className="space-y-4">
        <Link
          href="/app/formulas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Formulas
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-semibold">{formula.title}</h2>
              <Badge variant="outline">
                {serviceTypeLabels[formula.serviceType] || formula.serviceType}
              </Badge>
            </div>
            {formula.colorLine && (
              <p className="text-muted-foreground">{formula.colorLine}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/app/formulas/${formula.id}/edit`}>
              <Button variant="secondary">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <FormulaActions formula={formula} />
          </div>
        </div>
      </header>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <Link
                href={`/app/clients/${client.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-black font-medium">
                    {client.firstName[0]}{client.lastName?.[0] || ""}
                  </div>
                  <div>
                    <p className="font-medium">{getClientDisplayName(client)}</p>
                    <p className="text-sm text-muted-foreground">View profile</p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No client linked</p>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
              <p>{formatDate(formula.createdAt)}</p>
            </div>
            {formula.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {formula.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Formula Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {formula.steps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
              <p className="text-muted-foreground mb-2">No steps added yet</p>
              <p className="text-sm text-muted-foreground">
                Edit this formula to add mixing steps, ratios, and processing times.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formula.steps.map((step, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-medium text-emerald-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{step.stepName}</p>
                      <p className="text-sm text-muted-foreground">{step.product}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        {step.developer && <span>Developer: {step.developer}</span>}
                        {step.ratio && <span>Ratio: {step.ratio}</span>}
                        {step.grams && <span>{step.grams}g</span>}
                        {step.processingMins && <span>{step.processingMins} min</span>}
                      </div>
                      {step.notes && (
                        <p className="text-sm mt-2">{step.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {formula.notes ? (
            <p className="whitespace-pre-wrap">{formula.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
