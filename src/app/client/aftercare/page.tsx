import { Suspense } from "react";
import AftercareClient from "@/app/client/aftercare/AftercareClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AftercareClient />
    </Suspense>
  );
}
