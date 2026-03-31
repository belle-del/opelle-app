"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type ViewMode = "god" | "school" | "salon" | "practitioner" | "client";

export type LogLevel = "log" | "warn" | "error" | "info";

export interface ConsoleEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: number;
}

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  status: number | null;   // null while in-flight
  duration: number | null; // ms, null while in-flight
  timestamp: number;
}

interface DevContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  consoleLogs: ConsoleEntry[];
  networkLogs: NetworkEntry[];
  clearLogs: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

export const DevContext = createContext<DevContextValue | null>(null);

const LS_KEY = "opelle_dev_view_mode";
const MAX_ENTRIES = 100;

let _entryId = 0;
function nextId() { return ++_entryId; }

// Module-scope guard — survives React Strict Mode remounts
let _patchCallbacks: {
  appendConsole: ((e: ConsoleEntry) => void) | null;
  appendNetwork: ((e: NetworkEntry) => void) | null;
  updateNetwork: ((id: number, status: number, duration: number) => void) | null;
} = { appendConsole: null, appendNetwork: null, updateNetwork: null };
let _patched = false;

export function DevProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("god");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkEntry[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  // Restore viewMode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY) as ViewMode | null;
      if (stored && ["god","school","salon","practitioner","client"].includes(stored)) {
        setViewModeState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(LS_KEY, mode); } catch { /* ignore */ }
  }, []);

  const appendConsole = useCallback((entry: ConsoleEntry) => {
    setConsoleLogs((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    });
  }, []);

  const appendNetwork = useCallback((entry: NetworkEntry) => {
    setNetworkLogs((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    });
  }, []);

  const updateNetwork = useCallback((id: number, status: number, duration: number) => {
    setNetworkLogs((prev) =>
      prev.map((e) => e.id === id ? { ...e, status, duration } : e)
    );
  }, []);

  const clearLogs = useCallback(() => {
    setConsoleLogs([]);
    setNetworkLogs([]);
  }, []);

  // Wire up the module-scope patch callbacks to this provider instance
  useEffect(() => {
    // Update callbacks so the active provider receives log entries
    _patchCallbacks.appendConsole = appendConsole;
    _patchCallbacks.appendNetwork = appendNetwork;
    _patchCallbacks.updateNetwork = updateNetwork;

    // Patch once at module scope — survives React Strict Mode remounts
    if (!_patched) {
      _patched = true;

      // ── Console ──
      const levels: LogLevel[] = ["log", "warn", "error", "info"];
      levels.forEach((level) => {
        const orig = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
          orig(...args);
          const message = args
            .map((a) => {
              if (a === null) return "null";
              try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
              catch { return String(a); }
            })
            .join(" ");
          _patchCallbacks.appendConsole?.({ id: nextId(), level, message, timestamp: Date.now() });
        };
      });

      // ── Fetch ──
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        const id = nextId();
        const start = Date.now();

        _patchCallbacks.appendNetwork?.({ id, method, url, status: null, duration: null, timestamp: start });

        try {
          const response = await origFetch(input, init);
          _patchCallbacks.updateNetwork?.(id, response.status, Date.now() - start);
          return response;
        } catch (err) {
          _patchCallbacks.updateNetwork?.(id, -1, Date.now() - start);  // -1 = network error (not a real HTTP status)
          throw err;
        }
      };
    }

    // Cleanup: disconnect this provider's callbacks when it unmounts
    return () => {
      _patchCallbacks.appendConsole = null;
      _patchCallbacks.appendNetwork = null;
      _patchCallbacks.updateNetwork = null;
    };
  }, [appendConsole, appendNetwork, updateNetwork]);

  return (
    <DevContext.Provider value={{
      viewMode, setViewMode,
      consoleLogs, networkLogs,
      clearLogs,
      panelOpen, setPanelOpen,
    }}>
      {children}
    </DevContext.Provider>
  );
}

export function useDevMode(): DevContextValue {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error("useDevMode must be used inside DevProvider");
  return ctx;
}
