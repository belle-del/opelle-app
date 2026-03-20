import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/db/clients";
import { getAppointmentsForClient } from "@/lib/db/appointments";
import { getFormulaEntriesForClient } from "@/lib/db/formula-entries";
import { listServiceTypes } from "@/lib/db/service-types";
import { getThreadsForClient, getMessagesForThread } from "@/lib/db/messaging";
import { getClientProfile, getRebookMessage } from "@/lib/kernel";
import { computeRebookIntelligence } from "@/lib/rebook";
import { FormulaHistory } from "./_components/FormulaHistory";
import { ClientDetailTabs } from "./_components/ClientDetailTabs";
import { getClientDisplayName } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Edit, Calendar, Plus, Sparkles } from "lucide-react";
import { MentisSuggestions } from "../../_components/MentisSuggestions";
import { PortalAccountCard } from "./_components/PortalAccountCard";
import { PortalPermissions } from "./_components/PortalPermissions";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/lib/types";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  // Phase 1: DB queries (parallel)
  const [client, appointments, formulaEntries, serviceTypes, threads] = await Promise.all([
    getClient(id),
    getAppointmentsForClient(id),
    getFormulaEntriesForClient(id),
    listServiceTypes(),
    getThreadsForClient(id),
  ]);

  if (!client) {
    notFound();
  }

  // Phase 1b: Fetch messages for each thread (parallel)
  const threadsWithMessages = await Promise.all(
    threads.map(async (thread) => ({
      thread,
      messages: await getMessagesForThread(thread.id),
    }))
  );

  // Phase 2: Intelligence (depends on Phase 1 data)
  const rebookStats = computeRebookIntelligence(appointments);

  // Use cached preference profile if available, otherwise call kernel when enough data exists
  // Client-submitted preference data (from portal) shows regardless of formula count
  let kernelProfile = client.preferenceProfile ?? null;

  if (!kernelProfile && formulaEntries.length >= 2) {
    kernelProfile = await getClientProfile({
      clientName: getClientDisplayName(client),
      clientNotes: client.notes ?? null,
      tags: client.tags,
      formulaHistory: formulaEntries.slice(0, 20).map((fe) => ({
        service_date: fe.serviceDate,
        raw_notes: fe.rawNotes,
        general_notes: fe.generalNotes,
      })),
      appointmentHistory: appointments.slice(0, 20).map((a) => ({
        service_name: a.serviceName,
        start_at: a.startAt,
        status: a.status,
      })),
    });
  }

  // Only generate rebook message for non-on_track urgency
  const rebookMessage = rebookStats && rebookStats.urgency !== "on_track"
    ? await getRebookMessage({
        clientName: client.firstName,
        daysSinceLastVisit: rebookStats.days_since_last_visit,
        avgCadenceDays: rebookStats.avg_days_between_visits,
        urgency: rebookStats.urgency,
        lastServiceName: rebookStats.last_service_name,
        lastServiceDate: rebookStats.last_service_date,
      })
    : null;

  const rebookData = rebookStats ? {
    ...rebookStats,
    suggested_message: rebookMessage?.suggested_message ?? null,
  } : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/clients"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-on-bark, #F5F0E8)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-white" style={{ background: "linear-gradient(135deg, #6A90AE, #8FADC8)" }}>
              {client.firstName[0]}
              {client.lastName?.[0] || ""}
            </div>
            <div>
              <h2 className="text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest, #FAF8F3)" }}>{getClientDisplayName(client)}</h2>
              {client.pronouns && (
                <p className="text-muted-foreground">{client.pronouns}</p>
              )}
            </div>
          </div>
          <Link href={`/app/clients/${client.id}/edit`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </header>

      {/* Portal Account Status */}
      <PortalAccountCard clientId={client.id} />

      {/* Portal Permissions */}
      <PortalPermissions
        clientId={client.id}
        initialPermissions={client.permissions || DEFAULT_CLIENT_PERMISSIONS}
      />

      {/* Metis Suggestions */}
      <MentisSuggestions
        page="client-detail"
        entityType="client"
        entityData={{
          clientName: getClientDisplayName(client),
          clientId: client.id,
          tags: client.tags,
          notes: client.notes,
        }}
      />

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <p>{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                <p>{client.phone}</p>
              </div>
            )}
            {!client.email && !client.phone && (
              <p className="text-sm text-muted-foreground">No contact info</p>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Added</p>
              <p>{formatDate(client.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {client.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {client.notes ? (
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stylist Intelligence (Kernel-powered — only shows when data exists) */}
      {kernelProfile && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-5 h-5" />
              Stylist Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Color Direction</p>
                <p className="mt-1">{kernelProfile.colorDirection}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Preferred Developer</p>
                <p className="mt-1">{kernelProfile.preferredDeveloper}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Maintenance Level</p>
                <p className="mt-1">{kernelProfile.maintenanceLevel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Visit Cadence</p>
                <p className="mt-1">
                  Every ~{kernelProfile.visitCadenceDays} days ({kernelProfile.totalVisits} visits total)
                </p>
              </div>
            </div>
            {kernelProfile.styleNotes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Style Notes</p>
                <p className="mt-1">{kernelProfile.styleNotes}</p>
              </div>
            )}
            {kernelProfile.allergies && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Allergies / Sensitivities</p>
                <p className="mt-1">{kernelProfile.allergies}</p>
              </div>
            )}
            {kernelProfile.lifestyleNotes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lifestyle Notes</p>
                <p className="mt-1">{kernelProfile.lifestyleNotes}</p>
              </div>
            )}
            {kernelProfile.nextVisitSuggestion && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Next Visit Suggestion</p>
                <p className="mt-1">{kernelProfile.nextVisitSuggestion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rebook Intelligence (Kernel-powered) */}
      {rebookData && (
        <Card style={{ borderColor: "rgba(143,173,200,0.2)", backgroundColor: "rgba(143,173,200,0.05)" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "var(--blue)" }}>Rebooking Window</p>
                <p className="text-sm text-muted-foreground">
                  {rebookData.days_since_last_visit} days since last visit
                  (avg: {rebookData.avg_days_between_visits} days)
                </p>
              </div>
              <Badge variant={
                rebookData.urgency === "overdue" ? "danger" :
                rebookData.urgency === "approaching" ? "warning" : "outline"
              }>
                {rebookData.urgency}
              </Badge>
            </div>
            {rebookData.suggested_message && (
              <p className="mt-3 text-sm text-muted-foreground italic">
                &ldquo;{rebookData.suggested_message}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {appointments.length} total
            </p>
          </div>
          <Link href={`/app/appointments/new?clientId=${client.id}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No appointments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <Link
                  key={appt.id}
                  href={`/app/appointments/${appt.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{appt.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(appt.startAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appt.status === "completed" ? "success" :
                        appt.status === "cancelled" ? "danger" : "outline"
                      }
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formula History + Inspo Tabs */}
      <Card>
        <CardContent className="p-6">
          <ClientDetailTabs
            clientId={client.id}
            clientName={getClientDisplayName(client)}
            threads={threadsWithMessages}
            appointments={appointments}
          >
            <FormulaHistory
              clientId={client.id}
              entries={formulaEntries}
              serviceTypes={serviceTypes}
            />
          </ClientDetailTabs>
        </CardContent>
      </Card>
    </div>
  );
}
