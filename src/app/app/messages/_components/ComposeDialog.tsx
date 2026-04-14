"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, X, Send } from "lucide-react";

type ClientOption = { id: string; firstName: string; lastName?: string };
type TemplateOption = {
  id: string;
  name: string;
  category: string;
  bodyTemplate: string;
};

export function ComposeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Fetch clients and templates when dialog opens
  useEffect(() => {
    if (!open) return;

    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
        else if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {});

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates);
        else if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {});
  }, [open]);

  // Apply template body when template is selected
  useEffect(() => {
    if (!selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (template) {
      setBody(template.bodyTemplate);
    }
  }, [selectedTemplateId, templates]);

  const handleSend = async () => {
    if (!selectedClientId) {
      setError("Please select a client");
      return;
    }
    if (!body.trim()) {
      setError("Please enter a message");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          body: body.trim(),
          templateId: selectedTemplateId || undefined,
        }),
      });

      if (res.ok) {
        setOpen(false);
        setSelectedClientId("");
        setSelectedTemplateId("");
        setBody("");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message");
      }
    } catch {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedClientId("");
    setSelectedTemplateId("");
    setBody("");
    setError("");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Message
      </Button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={handleClose}
          />

          {/* Dialog */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="w-full max-w-lg"
              style={{
                pointerEvents: "auto",
                background: "var(--stone-card)",
                borderRadius: "12px",
                border: "1px solid var(--brass-line)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              {/* Dialog Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: "1px solid var(--brass-line)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "16px",
                    color: "var(--text-on-stone)",
                    fontWeight: 400,
                  }}
                >
                  New Message
                </h3>
                <button
                  onClick={handleClose}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-on-stone-faint)",
                    padding: "4px",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dialog Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Client Selector */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--text-on-stone-faint)",
                      marginBottom: "6px",
                    }}
                  >
                    To
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--brass-line)",
                      background: "var(--stone-light)",
                      color: "var(--text-on-stone)",
                      fontSize: "12px",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  >
                    <option value="">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Selector */}
                {templates.length > 0 && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--text-on-stone-faint)",
                        marginBottom: "6px",
                      }}
                    >
                      Template (optional)
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--brass-line)",
                        background: "var(--stone-light)",
                        color: "var(--text-on-stone)",
                        fontSize: "12px",
                        fontFamily: "'DM Sans', sans-serif",
                        outline: "none",
                      }}
                    >
                      <option value="">No template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--text-on-stone-faint)",
                      marginBottom: "6px",
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    rows={5}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--brass-line)",
                      background: "var(--stone-light)",
                      color: "var(--text-on-stone)",
                      fontSize: "12px",
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Preview */}
                {body.trim() && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--text-on-stone-faint)",
                        marginBottom: "6px",
                      }}
                    >
                      Preview
                    </label>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "var(--garnet)",
                        border: "1px solid var(--garnet-vivid)",
                        color: "var(--stone-lightest)",
                        fontSize: "12px",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {body.trim()}
                    </div>
                  </div>
                )}

                {error && (
                  <p style={{ fontSize: "11px", color: "var(--garnet-ruby)" }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Dialog Footer */}
              <div
                className="flex items-center justify-end gap-2 px-5 py-4"
                style={{ borderTop: "1px solid var(--brass-line)" }}
              >
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !selectedClientId || !body.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
