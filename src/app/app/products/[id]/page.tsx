import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct } from "@/lib/db/products";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, Package, Barcode, DollarSign } from "lucide-react";
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
