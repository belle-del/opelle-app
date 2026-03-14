import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/client-auth";
import { ConsultFormClient } from "./_components/ConsultFormClient";

interface ConsultPageProps {
  params: Promise<{ consultId: string }>;
}

export default async function ConsultPage({ params }: ConsultPageProps) {
  const ctx = await getClientContext();
  if (!ctx) redirect("/client/join");

  const { consultId } = await params;

  return (
    <ConsultFormClient
      consultId={consultId}
      stylistName={ctx.stylistName}
    />
  );
}
