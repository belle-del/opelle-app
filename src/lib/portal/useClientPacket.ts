"use client";

import { useEffect, useState } from "react";
import type { ClientPacketV1 } from "@/lib/portal/packet";

type PacketState = {
  loading: boolean;
  error: string | null;
  packet: ClientPacketV1 | null;
};

const cacheKey = (token: string) => `opelle:client:v1:packet:${token}`;

export const useClientPacket = (token: string | null) => {
  const [state, setState] = useState<PacketState>({
    loading: Boolean(token),
    error: null,
    packet: null,
  });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: null, packet: null });
      return;
    }

    let isActive = true;
    const cached =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(cacheKey(token))
        : null;

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ClientPacketV1;
        if (isActive) {
          setState({ loading: false, error: null, packet: parsed });
        }
        return () => {
          isActive = false;
        };
      } catch {
        // ignore cache parse errors
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(`/api/client/packet?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = (await res.json()) as
          | { ok: true; packet: ClientPacketV1 }
          | { ok: false; error: string };
        if (!res.ok || !json.ok) {
          throw new Error("invalid_token");
        }
        return json.packet;
      })
      .then((packet) => {
        if (!isActive) return;
        setState({ loading: false, error: null, packet });
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            cacheKey(token),
            JSON.stringify(packet)
          );
        }
      })
      .catch((err) => {
        if (!isActive) return;
        const message =
          err instanceof Error ? err.message : "Unable to load packet.";
        setState({ loading: false, error: message, packet: null });
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  return state;
};
