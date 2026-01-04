"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchDataHealth, type DataHealth } from "@/lib/dataHealth";

type DataHealthState = {
  data: DataHealth;
  loading: boolean;
  refresh: () => void;
};

const DataHealthContext = createContext<DataHealthState | undefined>(undefined);

const initialData: DataHealth = {
  ok: false,
  mode: process.env.NEXT_PUBLIC_DATA_MODE ?? null,
  dbProbeOk: false,
};

export function DataHealthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<DataHealth>(initialData);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    fetchDataHealth()
      .then((next) => {
        if (!active) return;
        setData(next);
      })
      .catch((error) => {
        if (!active) return;
        setData({
          ok: false,
          mode: process.env.NEXT_PUBLIC_DATA_MODE ?? null,
          dbProbeOk: false,
          error: error instanceof Error ? error.message : "Health check failed.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    return () => {
      if (typeof cancel === "function") cancel();
    };
  }, [refresh]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if ((data.mode ?? process.env.NEXT_PUBLIC_DATA_MODE) !== "db") return;
      setData((prev) => ({
        ...prev,
        ok: false,
        dbProbeOk: false,
        error: detail || "DB error detected.",
      }));
    };
    window.addEventListener("opelle:db-error", handler);
    return () => window.removeEventListener("opelle:db-error", handler);
  }, [data.mode]);

  const value = useMemo(
    () => ({
      data,
      loading,
      refresh,
    }),
    [data, loading, refresh]
  );

  return (
    <DataHealthContext.Provider value={value}>
      {children}
    </DataHealthContext.Provider>
  );
}

export { DataHealthContext };
