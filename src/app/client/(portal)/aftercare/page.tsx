"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";

type AftercarePlan = {
  id: string;
  clientVisibleNotes?: string;
  recommendedProducts: string[];
  publishedAt: string;
};

export default function AftercarePage() {
  const [plans, setPlans] = useState<AftercarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/aftercare")
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "24px",
          color: "#2C2C24",
        }}
      >
        Aftercare
      </h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2
            className="animate-spin"
            style={{ width: "24px", height: "24px", color: "#7A7A72" }}
          />
        </div>
      ) : plans.length === 0 ? (
        <Card style={{ border: "1px dashed #E8E0D0" }}>
          <CardContent className="py-8 text-center">
            <Heart
              style={{ width: "32px", height: "32px", margin: "0 auto 12px", color: "#7A7A72" }}
            />
            <p
              style={{
                color: "var(--text-on-stone-faint)",
                fontSize: "14px",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              No aftercare plans yet
            </p>
            <p style={{ color: "#7A7A72", fontSize: "12px", marginTop: "4px" }}>
              Your stylist will share aftercare instructions after your appointments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan, i) => (
            <Card key={plan.id}>
              <CardContent style={{ padding: "20px" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Heart
                    style={{ width: "16px", height: "16px", color: "var(--garnet-vivid, #9B4545)" }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#7A7A72",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {i === 0
                      ? "Latest"
                      : new Date(plan.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#2C2C24",
                    lineHeight: "1.7",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {plan.clientVisibleNotes || "No notes provided."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
