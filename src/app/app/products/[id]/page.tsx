import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct } from "@/lib/db/products";
import { getProductEnrichment } from "@/lib/kernel";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, Package, Barcode, DollarSign, Sparkles } from "lucide-react";
import { ProductActions } from "./_components/ProductActions";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

const categoryLabels: Record<string, string> = {
  permanent: "Permanent",
  "demi-permanent": "Demi-Permanent",
  "semi-permanent": "Semi-Permanent",
  lightener: "Lightener",
  toner: "Toner",
  developer: "Developer",
  additive: "Additive",
  other: "Other",
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  // Use DB-stored enrichment first, fall back to live kernel query
  const kernelEnrichment = !product.enrichment
    ? await getProductEnrichment({
        brand: product.brand,
        line: product.line,
        shade: product.shade,
        category: product.category,
        name: product.name,
        notes: product.notes,
      })
    : null;
  const enrichment = product.enrichment ?? kernelEnrichment;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-semibold">
                {product.brand} {product.shade}
              </h2>
              <Badge variant="outline">
                {categoryLabels[product.category] || product.category}
              </Badge>
            </div>
            {product.line && (
              <p className="text-muted-foreground">{product.line}</p>
            )}
            {product.name && (
              <p className="text-muted-foreground">{product.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/app/products/${product.id}/edit`}>
              <Button variant="secondary">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <ProductActions product={product} />
          </div>
        </div>
      </header>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Brand</p>
                <p>{product.brand}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Shade</p>
                <p>{product.shade}</p>
              </div>
              {product.line && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Line</p>
                  <p>{product.line}</p>
                </div>
              )}
              {product.name && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Color Name</p>
                  <p>{product.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                <p>{categoryLabels[product.category]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Added</p>
                <p>{formatDate(product.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Inventory & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</p>
                <p className="text-2xl font-semibold">
                  <span
                    className={
                      product.quantity <= product.lowStockThreshold
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }
                  >
                    {product.quantity}
                  </span>
                </p>
                {product.quantity <= product.lowStockThreshold && product.quantity > 0 && (
                  <p className="text-xs text-amber-400 mt-1">Low stock</p>
                )}
                {product.quantity === 0 && (
                  <p className="text-xs text-red-400 mt-1">Out of stock</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Low Stock Alert</p>
                <p>Below {product.lowStockThreshold} units</p>
              </div>
              {(product.sizeOz || product.sizeGrams) && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Size</p>
                  <p>
                    {product.sizeOz ? `${product.sizeOz} oz` : ""}
                    {product.sizeOz && product.sizeGrams ? " / " : ""}
                    {product.sizeGrams ? `${product.sizeGrams}g` : ""}
                  </p>
                </div>
              )}
              {product.costCents !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost</p>
                  <p>${(product.costCents / 100).toFixed(2)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barcode */}
      {product.barcode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5" />
              Barcode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg">{product.barcode}</p>
          </CardContent>
        </Card>
      )}

      {/* Product Intelligence (Kernel-powered — only shows when data exists) */}
      {enrichment && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-5 h-5" />
              Product Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Shade Family</p>
                <p className="mt-1">{enrichment.shadeFamily}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Level / Tone</p>
                <p className="mt-1">Level {enrichment.level} — {enrichment.tone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Typical Developer</p>
                <p className="mt-1">{enrichment.typicalDeveloper} ({enrichment.typicalRatio})</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Usage</p>
                <p className="mt-1">{enrichment.avgUsageOzPerAppointment}oz per appointment</p>
              </div>
            </div>
            {enrichment.commonlyMixedWith?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Commonly Mixed With</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {enrichment.commonlyMixedWith.map((shade) => (
                    <Badge key={shade} variant="outline">{shade}</Badge>
                  ))}
                </div>
              </div>
            )}
            {enrichment.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                <p className="mt-1 text-muted-foreground">{enrichment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {product.notes ? (
            <p className="whitespace-pre-wrap">{product.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
