import { Card, CardContent } from "@/components/ui/card";

export default function ProductsPage() {
  return (
    <div className="space-y-5">
      <h1
        className="text-xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        Products
      </h1>

      <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
        <CardContent className="py-8 text-center">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif" }}>
            Product orders are coming in Phase 5
          </p>
          <p style={{ color: "var(--text-on-stone-ghost)", fontSize: "12px", marginTop: "4px" }}>
            Request products directly from your stylist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
