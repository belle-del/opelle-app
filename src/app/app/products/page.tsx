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
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Inventory
          </p>
          <h2 className="text-3xl font-semibold">Products</h2>
          <p className="text-muted-foreground">
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
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-6">
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
          {products.map((product) => (
            <Link key={product.id} href={`/app/products/${product.id}`}>
              <Card className="hover:bg-white/10 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {product.brand} {product.shade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.line || product.name || categoryLabels[product.category]}
                          {product.name && product.line ? ` - ${product.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {categoryLabels[product.category] || product.category}
                      </Badge>
                      {product.quantity > 0 && (
                        <Badge
                          variant="outline"
                          className={
                            product.quantity <= product.lowStockThreshold
                              ? "border-amber-500/50 text-amber-400"
                              : "border-emerald-500/50 text-emerald-400"
                          }
                        >
                          Qty: {product.quantity}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {formatDate(product.createdAt)}
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
