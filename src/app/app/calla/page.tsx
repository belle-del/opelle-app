"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CallaChat from "./_components/CallaChat";

export default function CallaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/calla/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile?.onboardingCompletedAt) {
          router.replace("/app/calla/onboarding");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace("/app/calla/onboarding"));
  }, [router]);

  if (!ready) return null;
  return <CallaChat />;
}
