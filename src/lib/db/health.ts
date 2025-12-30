export const isDbConfigured = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export const formatDbError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Unable to reach the database.";
};
