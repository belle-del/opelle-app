import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { Card, CardContent } from "@/components/ui/card";
import { InspoPageClient } from "./_components/InspoPageClient";

export default async function InspoPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  if (!ctx.client.permissions?.can_upload_inspo) {
    return (
      <div className="space-y-5">
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#2C2C24" }}>
          Inspo
        </h1>
        <Card style={{ border: "1px dashed #E8E0D0" }}>
          <CardContent className="py-8 text-center">
            <p style={{ fontSize: "14px", color: "#7A7A72", fontFamily: "'Cormorant Garamond', serif" }}>
              Your stylist manages this for you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <InspoPageClient />;
}
