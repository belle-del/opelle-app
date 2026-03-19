import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/lib/db/products";
import { formatDate } from "@/lib/utils";
import { Plus, Package, ChevronRight } from "lucide-react";

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

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass, #C4AB70)", marginBottom: "4px" }}>
            Inventory
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "var(--stone-lightest, #FAF8F3)", fontWeight: 300 }}>
            Products
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-on-bark, #F5F0E8)", marginTop: "4px" }}>
            {products.length} {products.length === 1 ? "product" : "products"} in inventory
          </p>
        </div>
        <Link href="/app/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </header>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-on-stone-ghost)" }} />
            <h3 style={{ fontSize: "14px", fontFamily: "'Fraunces', serif", color: "var(--text-on-stone)", fontWeight: 400, marginBottom: "8px" }}>No products yet</h3>
            <p style={{ fontSize: "12px", color: "var(--text-on-stone-faint)", marginBottom: "16px" }}>
              Add your color tubes and products to build formulas faster.
            </p>
            <Link href="/app/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isLow = product.quantity <= product.lowStockThreshold;
            return (
              <Link key={product.id} href={`/app/products/${product.id}`}>
                <Card className="cursor-pointer" style={{ marginBottom: "8px" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "30px", height: "30px", borderRadius: "50%",
                            background: "var(--brass-glow)",
                          }}
                        >
                          <Package className="w-4 h-4" style={{ color: "var(--brass-warm)" }} />
                        </div>
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                            {product.brand} {product.shade}
                          </p>
                          <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                            {product.line || product.name || categoryLabels[product.category]}
                            {product.name && product.line ? ` - ${product.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass)" }}>
                          {categoryLabels[product.category] || product.category}
                        </span>
                        {product.quantity > 0 && (
                          <Badge variant={isLow ? "danger" : "success"}>
                            Qty: {product.quantity}
                          </Badge>
                        )}
                        <span className="hidden sm:block" style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                          {formatDate(product.createdAt)}
                        </span>
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--text-on-stone-ghost)" }} />
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
