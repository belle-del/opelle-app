"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Formula } from "@/lib/types";

interface FormulaActionsProps {
  formula: Formula;
}

export function FormulaActions({ formula }: FormulaActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this formula?")) return;

    setLoading(true);
    try {
      await fetch(`/api/formulas/${formula.id}`, { method: "DELETE" });
      router.push("/app/formulas");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete formula:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-400 hover:text-red-300"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
