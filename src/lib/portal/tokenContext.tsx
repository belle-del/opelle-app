"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

const TOKEN_KEY = "opelle:client:v1:token";

type TokenContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
};

const TokenContext = createContext<TokenContextValue | null>(null);

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setTokenState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryToken = searchParams.get("token");
    if (queryToken && queryToken.trim().length > 0) {
      const trimmed = queryToken.trim();
      setTokenState(trimmed);
      window.localStorage.setItem(TOKEN_KEY, trimmed);
    }
  }, [searchParams]);

  const setToken = useCallback((nextToken: string | null) => {
    if (typeof window === "undefined") return;
    if (!nextToken) {
      window.localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      return;
    }
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setTokenState(nextToken);
  }, []);

  const value = useMemo(() => ({ token, setToken }), [token, setToken]);

  return (
    <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
  );
};

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context;
};
