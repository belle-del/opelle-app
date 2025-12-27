import { Suspense } from "react";
import AftercareClient from "@/app/client/aftercare/AftercareClient";

export default function Page({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AftercareClient initialToken={token} />
    </Suspense>
  );
}
