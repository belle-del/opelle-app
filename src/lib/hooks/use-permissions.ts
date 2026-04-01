"use client";

import { useState, useEffect, useCallback } from "react";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole, Permission } from "@/lib/permissions";

interface PermissionsState {
  role: TeamRole;
  permissions: Record<string, boolean>;
  loading: boolean;
}

interface UsePermissionsReturn {
  /** Current user's team role */
  role: TeamRole;
  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;
  /** True while fetching permissions from server */
  loading: boolean;
}

/**
 * Client-side hook to check the current user's permissions.
 * Fetches role + overrides from /api/team/permissions on mount.
 * Returns { role, can(permission), loading }.
 */
export function usePermissions(): UsePermissionsReturn {
  const [state, setState] = useState<PermissionsState>({
    role: "owner", // default to owner (most permissive) to avoid flash of hidden content
    permissions: {},
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/team/permissions", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch permissions");
        return res.json();
      })
      .then((data: { role: string; permissions: Record<string, boolean> }) => {
        if (!cancelled) {
          setState({
            role: data.role as TeamRole,
            permissions: data.permissions ?? {},
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          // On error, fall back to student (least privilege) — never grant owner on failure
          setState({ role: "student", permissions: {}, loading: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const can = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(state.role, permission, state.permissions);
    },
    [state.role, state.permissions],
  );

  return { role: state.role, can, loading: state.loading };
}
