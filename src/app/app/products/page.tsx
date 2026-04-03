import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/lib/db/products";
import { listActiveAlerts } from "@/lib/db/inventory";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { Plus, Package, ChevronRight, History } from "lucide-react";
import { InventorySummaryBar } from "./_components/InventorySummaryBar";
import { AlertBanner } from "./_components/AlertBanner";
import { QuickAdjustButton } from "./_components/QuickAdjustButton";

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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/login");

  const [products, activeAlerts] = await Promise.all([
    listProducts(),
    listActiveAlerts(workspaceId),
  ]);

  const totalValueCents = products.reduce((sum, p) => {
    const cost = p.costCents ?? 0;
    return sum + cost * p.quantity;
  }, 0);

  const lowStockCount = products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold
  ).length;

  const outOfStockCount = products.filter((p) => p.quantity <= 0).length;

  const productNames: Record<string, string> = {};
  for (const p of products) {
    productNames[p.id] = `${p.brand} ${p.shade}`;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A", marginBottom: "4px" }}>
            Inventory
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
            Products
          </h2>
          <p style={{ fontSize: "12px", color: "#7A7060", marginTop: "4px" }}>
            {products.length} {products.length === 1 ? "product" : "products"} in inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/products/movements">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              Movement History
            </Button>
          </Link>
          <Link href="/app/products/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </header>

      {products.length > 0 && (
        <InventorySummaryBar
          totalProducts={products.length}
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          totalValueCents={totalValueCents}
        />
      )}

      <AlertBanner alerts={activeAlerts} productNames={productNames} />

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
            const isLow = product.quantity > 0 && product.quantity <= product.lowStockThreshold;
            const isOut = product.quantity <= 0;
            return (
              <Card
                key={product.id}
                style={{
                  marginBottom: "8px",
                  borderColor: isOut
                    ? "rgba(139,58,58,0.5)"
                    : isLow
                    ? "rgba(139,58,58,0.25)"
                    : undefined,
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/app/products/${product.id}`} className="flex items-center gap-3 flex-1">
                      <div
                        className="flex items-center justify-center"
                        style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--brass-glow)" }}
                      >
                        <Package className="w-4 h-4" style={{ color: "var(--brass-warm)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-on-stone)" }}>
                          {product.brand} {product.shade}
                        </p>
                        <p style={{ fontSize: "9px", color: "var(--text-on-stone-faint)" }}>
                          {product.line || product.name || categoryLabels[product.category]}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brass)" }}>
                        {categoryLabels[product.category] || product.category}
                      </span>
                      <Badge variant={isOut ? "danger" : isLow ? "danger" : "success"}>
                        {isOut ? "Out" : `Qty: ${product.quantity}`}
                      </Badge>
                      <QuickAdjustButton
                        productId={product.id}
                        productName={`${product.brand} ${product.shade}`}
                        currentStock={product.quantity}
                      />
                      <Link href={`/app/products/${product.id}`}>
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--text-on-stone-ghost)" }} />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
