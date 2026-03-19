"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [barcode, setBarcode] = useState("");

  const handleBarcodeScan = async (code: string) => {
    setBarcode(code);
    setShowScanner(false);

    // Check if this barcode already exists
    try {
      const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found) {
        // Product already exists, redirect to it
        router.push(`/app/products/${data.product.id}`);
        return;
      }
    } catch {
      // Ignore lookup errors, just use the barcode
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: formData.get("brand"),
          shade: formData.get("shade"),
          category: formData.get("category"),
          line: formData.get("line") || undefined,
          name: formData.get("name") || undefined,
          sizeOz: formData.get("sizeOz") ? Number(formData.get("sizeOz")) : undefined,
          sizeGrams: formData.get("sizeGrams") ? Number(formData.get("sizeGrams")) : undefined,
          costCents: formData.get("cost") ? Math.round(Number(formData.get("cost")) * 100) : undefined,
          barcode: formData.get("barcode") || undefined,
          quantity: formData.get("quantity") ? Number(formData.get("quantity")) : 0,
          notes: formData.get("notes") || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add product");
      }

      const product = await res.json();
      router.push(`/app/products/${product.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/products"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-on-bark, #F5F0E8)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div>
          <h2 className="text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest, #FAF8F3)" }}>Add Product</h2>
          <p className="text-muted-foreground">
            Scan a barcode or enter product details manually.
          </p>
        </div>
      </header>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Details</CardTitle>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowScanner(true)}
            >
              <ScanBarcode className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {barcode && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
                Barcode scanned: {barcode}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  name="brand"
                  required
                  placeholder="e.g., Redken, Wella, Schwarzkopf"
                />
              </div>
              <div>
                <Label htmlFor="shade">Shade / Number *</Label>
                <Input
                  id="shade"
                  name="shade"
                  required
                  placeholder="e.g., 6N, 7RR, 10.1"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="line">Product Line</Label>
                <Input
                  id="line"
                  name="line"
                  placeholder="e.g., Shades EQ, Color Touch"
                />
              </div>
              <div>
                <Label htmlFor="name">Color Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Dark Mahogany Blonde"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select id="category" name="category" required defaultValue="">
                <option value="" disabled>Select category</option>
                <option value="permanent">Permanent</option>
                <option value="demi-permanent">Demi-Permanent</option>
                <option value="semi-permanent">Semi-Permanent</option>
                <option value="lightener">Lightener</option>
                <option value="toner">Toner</option>
                <option value="developer">Developer</option>
                <option value="additive">Additive</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <Label htmlFor="sizeOz">Size (oz)</Label>
                <Input
                  id="sizeOz"
                  name="sizeOz"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g., 2.0"
                />
              </div>
              <div>
                <Label htmlFor="sizeGrams">Size (grams)</Label>
                <Input
                  id="sizeGrams"
                  name="sizeGrams"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g., 60"
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 12.50"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity on Hand</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  defaultValue="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this product..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Product"}
              </Button>
              <Link href="/app/products">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
