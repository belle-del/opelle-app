"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Clock, AlertTriangle } from "lucide-react";
import type { InventoryPrediction } from "@/lib/types";

interface InventoryPredictionCardProps {
  productId: string;
}

export function InventoryPredictionCard({ productId }: InventoryPredictionCardProps) {
  const [prediction, setPrediction] = useState<InventoryPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/intelligence/inventory-predictions", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.predictions) {
          const match = data.predictions.find(
            (p: InventoryPrediction) => p.productId === productId
          );
          setPrediction(match ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || !prediction) return null;

  const TrendIcon =
    prediction.usageTrend === "increasing"
      ? TrendingUp
      : prediction.usageTrend === "decreasing"
        ? TrendingDown
        : Minus;

  const trendColor =
    prediction.usageTrend === "increasing"
      ? "text-amber-400"
      : prediction.usageTrend === "decreasing"
        ? "text-emerald-400"
        : "text-muted-foreground";

  const isUrgent =
    prediction.estimatedDaysUntilDepletion !== null &&
    prediction.estimatedDaysUntilDepletion <= 14;

  return (
    <Card className={isUrgent ? "border-amber-500/30 bg-amber-500/5" : ""} style={!isUrgent ? { borderColor: "rgba(196,171,112,0.2)", backgroundColor: "rgba(196,171,112,0.05)" } : undefined}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isUrgent ? "text-amber-400" : ""}`} style={!isUrgent ? { color: "var(--brass)" } : undefined}>
          {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          Inventory Prediction
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {prediction.confidence} confidence
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Days Until Depletion
            </p>
            <p className={`mt-1 text-lg font-semibold ${isUrgent ? "text-amber-400" : ""}`}>
              {prediction.estimatedDaysUntilDepletion != null
                ? `~${prediction.estimatedDaysUntilDepletion} days`
                : "Insufficient data"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Suggested Reorder
            </p>
            <p className="mt-1">
              {prediction.suggestedReorderDate
                ? new Date(prediction.suggestedReorderDate).toLocaleDateString()
                : "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Avg Usage
            </p>
            <p className="mt-1">
              {prediction.avgUsagePerWeek.toFixed(1)}/week &middot;{" "}
              {prediction.avgUsagePerMonth.toFixed(1)}/month
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Usage Trend
            </p>
            <p className={`mt-1 flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              {prediction.usageTrend.charAt(0).toUpperCase() + prediction.usageTrend.slice(1)}
            </p>
          </div>
        </div>
        {prediction.reasoning && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">AI Insight</p>
            <p className="mt-1 text-muted-foreground">{prediction.reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
