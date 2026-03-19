"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Loader2, Send, Save } from "lucide-react";

interface ContentEditorProps {
  initialData?: {
    id: string;
    title: string;
    body: string;
    category: string;
    status: string;
  };
}

export function ContentEditor({ initialData }: ContentEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;
  const isDraft = !initialData || initialData.status === "draft";

  const handleSave = async (e: React.FormEvent<HTMLFormElement>, publish: boolean) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const category = formData.get("category") as string;

    if (!title || !body || !category) {
      setError("Please fill in title, category, and body.");
      return;
    }

    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    setError(null);

    try {
      if (isEditing) {
        // Update existing post
        const res = await fetch(`/api/content/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, category }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update post");
        }

        // If publishing a draft
        if (publish && isDraft) {
          const pubRes = await fetch(`/api/content/${initialData.id}/publish`, {
            method: "POST",
          });
          if (!pubRes.ok) {
            throw new Error("Failed to publish post");
          }
        }
      } else {
        // Create new post
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, category, publish }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create post");
        }
      }

      router.push("/app/content");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <header style={{ marginBottom: "20px" }}>
        <Link
          href="/app/content"
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            fontSize: "12px",
            color: "var(--text-on-bark, #F5F0E8)",
            marginBottom: "12px",
            display: "inline-flex",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content
        </Link>
        <p
          style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--brass, #C4AB70)",
            marginBottom: "4px",
          }}
        >
          Content
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "26px",
            color: "var(--stone-lightest, #FAF8F3)",
            fontWeight: 300,
          }}
        >
          {isEditing ? "Edit Post" : "New Post"}
        </h2>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-on-bark-faint)",
            marginTop: "4px",
          }}
        >
          {isEditing
            ? "Update your content post."
            : "Create a tip, spotlight, or seasonal update for your clients."}
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              // Determine which button was clicked via submitter
              const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
              const shouldPublish = submitter?.dataset.publish === "true";
              handleSave(e, shouldPublish);
            }}
            className="space-y-6"
          >
            {error && (
              <div
                style={{
                  borderRadius: "8px",
                  background: "rgba(117,18,18,0.1)",
                  border: "1px solid rgba(117,18,18,0.2)",
                  padding: "12px",
                  fontSize: "13px",
                  color: "var(--garnet-ruby)",
                }}
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <Label htmlFor="title" className="mb-2 block">
                Title *
              </Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={initialData?.title || ""}
                placeholder="e.g., How to Maintain Your Color Between Visits"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="mb-2 block">
                Category *
              </Label>
              <Select
                id="category"
                name="category"
                required
                defaultValue={initialData?.category || ""}
              >
                <option value="" disabled>
                  Select category
                </option>
                <option value="tip">Tip</option>
                <option value="product_spotlight">Product Spotlight</option>
                <option value="seasonal">Seasonal</option>
              </Select>
            </div>

            {/* Body */}
            <div>
              <Label htmlFor="body" className="mb-2 block">
                Body *
              </Label>
              <Textarea
                id="body"
                name="body"
                required
                defaultValue={initialData?.body || ""}
                placeholder="Write your content here. Line breaks will be preserved..."
                rows={12}
                style={{ minHeight: "200px" }}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-on-stone-faint)",
                  marginTop: "6px",
                }}
              >
                Line breaks will be preserved when displayed to clients.
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                paddingTop: "8px",
              }}
            >
              {isEditing ? (
                <>
                  <Button type="submit" disabled={saving || publishing}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update
                      </>
                    )}
                  </Button>
                  {isDraft && (
                    <Button
                      type="submit"
                      data-publish="true"
                      disabled={saving || publishing}
                      style={{
                        background: "var(--garnet)",
                        border: "1px solid var(--garnet-vivid)",
                        color: "var(--stone-lightest)",
                      }}
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button type="submit" disabled={saving || publishing}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    data-publish="true"
                    disabled={saving || publishing}
                    style={{
                      background: "var(--garnet)",
                      border: "1px solid var(--garnet-vivid)",
                      color: "var(--stone-lightest)",
                    }}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Publish
                      </>
                    )}
                  </Button>
                </>
              )}
              <Link href="/app/content" style={{ marginLeft: "auto" }}>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
