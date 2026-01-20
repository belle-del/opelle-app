"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";
import type { Appointment } from "@/lib/types";

interface AppointmentActionsProps {
  appointment: Appointment;
}

export function AppointmentActions({ appointment }: AppointmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: "completed" | "cancelled") => {
    setLoading(true);
    try {
      await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    setLoading(true);
    try {
      await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      router.push("/app/appointments");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {appointment.status === "scheduled" && (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateStatus("completed")}
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateStatus("cancelled")}
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
        className="text-red-400 hover:text-red-300"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
