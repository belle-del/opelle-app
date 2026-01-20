"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { Formula, Client } from "@/lib/types";

interface EditFormulaPageProps {
  params: Promise<{ id: string }>;
}

export default function EditFormulaPage({ params }: EditFormulaPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/formulas/${id}`).then((res) => res.json()),
      fetch("/api/clients").then((res) => res.json()),
    ])
      .then(([formulaData, clientsData]) => {
        setFormula(formulaData);
        setClients(clientsData);
      })
      .catch(() => setError("Failed to load data"));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/formulas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          serviceType: formData.get("serviceType"),
          colorLine: formData.get("colorLine") || undefined,
          notes: formData.get("notes") || undefined,
          clientId: formData.get("clientId") || undefined,
          tags: formData.get("tags")
            ? String(formData.get("tags")).split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update formula");
      }

      router.push(`/app/formulas/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!formula) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href={`/app/formulas/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Formula
        </Link>
        <div>
          <h2 className="text-3xl font-semibold">Edit Formula</h2>
          <p className="text-muted-foreground">
            Update formula details.
          </p>
        </div>
      </header>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Formula Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="title">Formula Name *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={formula.title}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select id="serviceType" name="serviceType" required defaultValue={formula.serviceType}>
                  <option value="color">Color</option>
                  <option value="lighten">Lightener</option>
                  <option value="tone">Toner</option>
                  <option value="gloss">Gloss</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="colorLine">Color Line</Label>
                <Input
                  id="colorLine"
                  name="colorLine"
                  defaultValue={formula.colorLine || ""}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientId">Client (optional)</Label>
              <Select
                id="clientId"
                name="clientId"
                defaultValue={formula.clientId || ""}
              >
                <option value="">No client linked</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={formula.tags.join(", ")}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={formula.notes || ""}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/app/formulas/${id}`}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
