"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const ClientAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(() => {
    setLoading(true);
    supabase.auth
      .getUser()
      .then(({ data }) => setUser(data.user ?? null))
      .finally(() => setLoading(false));
  }, [supabase]);

  useEffect(() => {
    loadUser();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [loadUser, supabase]);

  const value = useMemo(
    () => ({ user, loading, refresh: loadUser }),
    [loadUser, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useClientAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useClientAuth must be used within ClientAuthProvider");
  }
  return context;
};
