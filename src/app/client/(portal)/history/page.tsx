import { Card, CardContent } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="space-y-5">
      <h1
        className="text-xl"
        style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
      >
        History
      </h1>

      <Card style={{ border: "1px dashed var(--stone-shadow)" }}>
        <CardContent className="py-8 text-center">
          <p style={{ color: "var(--text-on-stone-faint)", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif" }}>
            Service history is coming in Phase 4
          </p>
          <p style={{ color: "var(--text-on-stone-ghost)", fontSize: "12px", marginTop: "4px" }}>
            View your past appointments and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
