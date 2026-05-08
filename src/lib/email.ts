// Thin wrapper over the Resend REST API. We avoid adding the `resend` npm
// package because we only need a single endpoint and don't want the build
// graph to grow for one call.
//
// Required env vars:
//   RESEND_API_KEY        - Server-side API key from resend.com.
//
// Optional env vars:
//   RESEND_FROM_EMAIL     - Sender. Defaults to the Resend sandbox address,
//                           which only delivers to the address that owns the
//                           Resend account. Set this to a verified-domain
//                           address (e.g. "Opélle <consults@dominusfoundry.com>")
//                           once you've added DNS records in Resend.

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Opélle <onboarding@resend.dev>";

  const body: Record<string, unknown> = {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  if (params.replyTo) body.reply_to = params.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildConsultEmail(args: {
  name: string;
  contact: string;
  hairStory?: string;
  goals?: string;
  budget?: string;
  timing?: string;
  referrer?: string;
  photoCount: number;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `New consult from ${args.name}`;

  const lines: string[] = [
    `New consult from ${args.name}`,
    ``,
    `Contact: ${args.contact}`,
  ];
  if (args.referrer) lines.push(`Referred by: ${args.referrer}`);
  if (args.budget) lines.push(`Budget: ${args.budget}`);
  if (args.timing) lines.push(`Timing: ${args.timing}`);
  lines.push(`Photos: ${args.photoCount}`);
  if (args.goals) lines.push(``, `Goals:`, args.goals);
  if (args.hairStory) lines.push(``, `Hair story:`, args.hairStory);
  lines.push(``, `View in Opélle: ${args.appUrl}`);
  const text = lines.join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#111;font-size:14px;">${escapeHtml(value)}</td></tr>`;

  const rows = [
    row("Contact", args.contact),
    args.referrer ? row("Referred by", args.referrer) : "",
    args.budget ? row("Budget", args.budget) : "",
    args.timing ? row("Timing", args.timing) : "",
    row("Photos", String(args.photoCount)),
  ]
    .filter(Boolean)
    .join("");

  const block = (label: string, value: string) =>
    `<div style="margin-top:20px;"><div style="color:#666;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${escapeHtml(label)}</div><div style="color:#111;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(value)}</div></div>`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #ece8e0;padding:32px;">
        <tr><td>
          <div style="color:#5a6650;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Opélle · New consult</div>
          <h1 style="margin:0 0 24px 0;color:#111;font-size:24px;font-weight:600;">${escapeHtml(args.name)}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>
          ${args.goals ? block("Goals", args.goals) : ""}
          ${args.hairStory ? block("Hair story", args.hairStory) : ""}
          <div style="margin-top:32px;">
            <a href="${escapeHtml(args.appUrl)}" style="display:inline-block;background:#5a6650;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;">View in Opélle</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}
