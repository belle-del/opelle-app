"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { ContentEditor } from "../../new/_components/ContentEditor";

interface EditContentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditContentPage({ params }: EditContentPageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<{
    id: string;
    title: string;
    body: string;
    category: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/content/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.post) {
          setPost(data.post);
        } else {
          setError("Post not found");
        }
      })
      .catch(() => setError("Failed to load post"));
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ fontSize: "14px", color: "var(--text-on-bark-faint)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!post) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "48px",
        }}
      >
        <Loader2
          style={{
            width: "24px",
            height: "24px",
            color: "var(--text-on-bark-ghost)",
          }}
          className="animate-spin"
        />
      </div>
    );
  }

  return <ContentEditor initialData={post} />;
}
