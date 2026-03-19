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
import { ArrowLeft, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { Product } from "@/lib/types";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setBarcode(data.barcode || "");
      })
      .catch(() => setError("Failed to load product"));
  }, [id]);

  const handleBarcodeScan = (code: string) => {
    setBarcode(code);
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
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
        throw new Error(data.error || "Failed to update product");
      }

      router.push(`/app/products/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
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
          href={`/app/products/${id}`}
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-on-bark, #F5F0E8)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Product
        </Link>
        <div>
          <h2 className="text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest, #FAF8F3)" }}>Edit Product</h2>
          <p className="text-muted-foreground">
            Update product details.
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

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  name="brand"
                  required
                  defaultValue={product.brand}
                />
              </div>
              <div>
                <Label htmlFor="shade">Shade / Number *</Label>
                <Input
                  id="shade"
                  name="shade"
                  required
                  defaultValue={product.shade}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="line">Product Line</Label>
                <Input
                  id="line"
                  name="line"
                  defaultValue={product.line || ""}
                />
              </div>
              <div>
                <Label htmlFor="name">Color Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={product.name || ""}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select id="category" name="category" required defaultValue={product.category}>
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
                  defaultValue={product.sizeOz || ""}
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
                  defaultValue={product.sizeGrams || ""}
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
                  defaultValue={product.costCents ? (product.costCents / 100).toFixed(2) : ""}
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
                  defaultValue={product.quantity}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={product.notes || ""}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/app/products/${id}`}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
