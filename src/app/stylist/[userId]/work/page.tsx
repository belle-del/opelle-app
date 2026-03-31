import { notFound } from "next/navigation";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import type { PhotoPair } from "@/lib/types";

interface Props {
  params: Promise<{ userId: string }>;
}

async function getPortfolioData(userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/portfolio/${userId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{
    pairs: PhotoPair[];
    stylistName: string;
    workspaceName: string;
    portfolioPublic: boolean;
  }>;
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { userId } = await params;
  const data = await getPortfolioData(userId);

  if (!data) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#1A1A14", color: "#F1EFE0" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(196,171,112,0.1)",
        padding: "24px",
        textAlign: "center",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,171,112,0.7)", marginBottom: "8px" }}>
          {data.workspaceName}
        </p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "32px", fontWeight: 300, color: "#FAF8F3" }}>
          {data.stylistName}
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(241,239,224,0.4)", marginTop: "8px" }}>
          {data.pairs.length} {data.pairs.length === 1 ? "service" : "services"}
        </p>
      </header>

      {/* Gallery */}
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <BeforeAfterGallery
          pairs={data.pairs}
          emptyMessage="No photos on file yet."
        />
      </main>
    </div>
  );
}
