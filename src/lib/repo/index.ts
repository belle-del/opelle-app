"use client";

import { useDataHealth } from "@/components/useDataHealth";
import * as demoRepo from "@/lib/repo/demoRepo";
import * as dbRepo from "@/lib/repo/dbRepo";

export type Repo = typeof demoRepo;

export const useRepo = (): Repo => {
  const { data } = useDataHealth();
  const mode = data.mode ?? null;
  if (mode === "db") {
    return dbRepo as Repo;
  }
  return demoRepo as Repo;
};
