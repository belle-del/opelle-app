"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Client } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Edit,
  Calendar,
  User,
  FileText,
  Clock,
  Move,
  CalendarDays,
} from "lucide-react";

interface AppointmentModalProps {
  appointment: Appointment;
  client: Client | undefined;
  clients: Client[];
  onClose: () => void;
}

export function AppointmentModal({
  appointment,
  client,
  clients,
  onClose,
}: AppointmentModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: appointment.clientId,
    serviceName: appointment.serviceName,
    startAt: new Date(appointment.startAt).toISOString().slice(0, 16),
    durationMins: appointment.durationMins,
    notes: appointment.notes || "",
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          serviceName: formData.serviceName,
          startAt: new Date(formData.startAt).toISOString(),
          durationMins: formData.durationMins,
          notes: formData.notes || undefined,
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        onClose();
      }
    } catch (error) {
      console.error("Failed to update appointment:", error);
      alert("Failed to update appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: "completed" | "cancelled") => {
    setLoading(true);
    try {
      await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update appointment status");
    } finally {
      setLoading(false);
    }
  };

  const viewClientCard = () => {
    router.push(`/app/clients/${appointment.clientId}`);
    onClose();
  };

  const viewFutureAppointments = () => {
    router.push(`/app/clients/${appointment.clientId}#appointments`);
    onClose();
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-1">
                  {isEditing ? "Edit Appointment" : "Appointment Details"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {client ? getClientDisplayName(client) : "Unknown Client"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEditing ? (
              /* Edit Form */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client">Client</Label>
                  <select
                    id="client"
                    value={formData.clientId}
                    onChange={(e) =>
                      setFormData({ ...formData, clientId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getClientDisplayName(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="service">Service Name</Label>
                  <Input
                    id="service"
                    value={formData.serviceName}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="startAt">Date & Time</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) =>
                      setFormData({ ...formData, startAt: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.durationMins}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMins: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdate} disabled={loading}>
                    Save Changes
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                {/* Appointment Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-muted-foreground">Date & Time:</span>
                    <span className="font-medium">
                      {formatDateTime(appointment.startAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {appointment.durationMins} minutes
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">{appointment.serviceName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground ml-7">Status:</span>
                    <span
                      className={`font-medium capitalize ${
                        appointment.status === "completed"
                          ? "text-emerald-400"
                          : appointment.status === "cancelled"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Notes
                    </h3>
                    <p className="text-sm bg-white/5 p-3 rounded-lg">
                      {appointment.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={viewClientCard}
                    className="w-full"
                  >
                    <User className="w-4 h-4 mr-2" />
                    View Client Card
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={viewFutureAppointments}
                    className="w-full"
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Future Appointments
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    <Move className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                </div>

                {/* Status Actions */}
                {appointment.status === "scheduled" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusUpdate("completed")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Mark Complete
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleStatusUpdate("cancelled")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancel Appointment
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
