import { Card, CardContent } from "@/components/ui/card";

export default function ProductsPage() {
  return (
    <div className="space-y-5">
      <h1
        style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24" }}
      >
        Products
      </h1>

      <Card style={{ border: "1px dashed #E8E0D0" }}>
        <CardContent className="py-8 text-center">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif" }}>
            Product orders are coming in Phase 5
          </p>
          <p style={{ color: "#7A7A72", fontSize: "12px", marginTop: "4px" }}>
            Request products directly from your stylist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
