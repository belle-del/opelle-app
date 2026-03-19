"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Submission = {
  id: string;
  client_notes: string | null;
  client_summary: string | null;
  feasibility: string | null;
  requires_consult: boolean;
  reviewed_by_stylist: boolean;
  created_at: string;
  photoUrls: string[];
};

type Props = {
  submissions: Submission[];
};

function getStatusBadge(sub: Submission): { label: string; variant: "default" | "success" } {
  if (sub.reviewed_by_stylist) {
    return { label: "Reviewed by stylist", variant: "success" };
  }
  if (sub.client_summary) {
    return { label: "Analyzed", variant: "default" };
  }
  return { label: "Submitted", variant: "default" };
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function InspoSubmissionsList({ submissions }: Props) {
  if (submissions.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: "var(--stone-mid)" }}
      >
        <p style={{ color: "var(--text-on-stone-faint)", fontSize: "13px" }}>
          No inspo uploads yet
        </p>
        <p
          style={{
            color: "#7A7A72",
            fontSize: "11px",
            marginTop: "4px",
          }}
        >
          Upload photos of looks you love and we&apos;ll help plan your next visit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => {
        const status = getStatusBadge(sub);

        return (
          <Card key={sub.id}>
            <CardContent className="py-3.5">
              <div className="flex gap-3">
                {/* Thumbnail */}
                {sub.photoUrls.length > 0 && (
                  <div
                    className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ border: "1px solid var(--stone-mid)" }}
                  >
                    <img
                      src={sub.photoUrls[0]}
                      alt="Inspo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#7A7A72",
                      }}
                    >
                      {formatRelativeDate(sub.created_at)}
                      {sub.photoUrls.length > 1
                        ? ` \u00B7 ${sub.photoUrls.length} photos`
                        : ""}
                    </p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  {sub.client_summary && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-on-stone-faint)",
                        marginTop: "4px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {sub.client_summary}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
