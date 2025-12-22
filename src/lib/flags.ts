const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

export const flags = {
  METIS_ASSIST_ENABLED: toBoolean(
    process.env.OPLE_METIS_ASSIST_ENABLED,
    false
  ),
  EMBEDDED_AI_ENABLED: toBoolean(
    process.env.OPLE_EMBEDDED_AI_ENABLED,
    true
  ),
  CLIENT_PORTAL_ENABLED: toBoolean(
    process.env.OPLE_CLIENT_PORTAL_ENABLED,
    true
  ),
};

export type Flags = typeof flags;
