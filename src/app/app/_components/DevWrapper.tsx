"use client";

import { DevProvider } from "@/lib/dev-context";
import { DevPanel } from "./DevPanel";

interface DevWrapperProps {
  children: React.ReactNode;
  showDevTools: boolean;
  userId?: string;
  workspaceId?: string;
  workspaceName?: string;
}

export function DevWrapper({
  children,
  showDevTools,
  userId,
  workspaceId,
  workspaceName,
}: DevWrapperProps) {
  if (!showDevTools) {
    return <>{children}</>;
  }

  return (
    <DevProvider>
      {children}
      <DevPanel
        userId={userId}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
    </DevProvider>
  );
}
