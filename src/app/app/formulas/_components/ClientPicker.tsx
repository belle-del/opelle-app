"use client";

import { useState, useEffect, useRef } from "react";
import type { Client } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";

interface ClientPickerProps {
  value: string;
  onChange: (clientId: string) => void;
}

export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        if (value) {
          const found = data.find((c: Client) => c.id === value);
          if (found) setSelectedClient(found);
        }
      })
      .catch(() => {});
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = clients.filter((c) => {
    const name = getClientDisplayName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSelect = (client: Client) => {
    setSelectedClient(client);
    onChange(client.id);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedClient(null);
    onChange("");
    setSearch("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      {selectedClient ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center text-sm font-medium text-black">
            {selectedClient.firstName[0]}
            {selectedClient.lastName?.[0] || ""}
          </div>
          <span className="flex-1 font-medium">
            {getClientDisplayName(selectedClient)}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a client..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
      )}

      {isOpen && !selectedClient && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-xl max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No clients found
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center text-sm font-medium text-black shrink-0">
                  {client.firstName[0]}
                  {client.lastName?.[0] || ""}
                </div>
                <span className="text-sm font-medium">
                  {getClientDisplayName(client)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
