import { createClient } from "@supabase/supabase-js";

const getAdminConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role key is not configured.");
  }
  return { url, serviceKey };
};

export const createSupabaseAdminClient = () => {
  const { url, serviceKey } = getAdminConfig();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
