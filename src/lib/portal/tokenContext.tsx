"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface TokenContextValue {
  token: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
}

const TokenContext = createContext<TokenContextValue | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("opelle:client:v1:token", newToken);
    } else {
      localStorage.removeItem("opelle:client:v1:token");
    }
  };

  const clearToken = () => {
    setToken(null);
  };

  return (
    <TokenContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useToken must be used within TokenProvider");
  }
  return context;
}
