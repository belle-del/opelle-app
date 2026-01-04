export type DataHealth = {
  ok: boolean;
  mode: string | null;
  dbProbeOk: boolean;
  dbProbeDetails?: string;
  error?: string;
};

export const fetchDataHealth = async (): Promise<DataHealth> => {
  try {
    const res = await fetch("/api/db/health");
    const json = (await res.json()) as Partial<DataHealth>;
    return {
      ok: Boolean(json.ok),
      mode:
        typeof json.mode === "string" || json.mode === null
          ? json.mode
          : null,
      dbProbeOk: Boolean(json.dbProbeOk),
      dbProbeDetails:
        typeof json.dbProbeDetails === "string"
          ? json.dbProbeDetails
          : undefined,
      error: typeof json.error === "string" ? json.error : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      mode: process.env.NEXT_PUBLIC_DATA_MODE ?? null,
      dbProbeOk: false,
      error: error instanceof Error ? error.message : "Unable to reach /api/db/health",
    };
  }
};
