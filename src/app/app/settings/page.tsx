"use client";

import { useState } from "react";
import { flags } from "@/lib/flags";
import type { OpelleBackupV1 } from "@/lib/models";
import { exportBackup, importBackup, resetAll } from "@/lib/storage";

export default function SettingsPage() {
  const supabaseUrlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [backupPreview, setBackupPreview] = useState<OpelleBackupV1 | null>(
    null
  );
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState("");

  const handleExport = async () => {
    const backup = await exportBackup();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `opelle-backup-v1-${date}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBackupPreview(null);
      setImportStatus(null);
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "version" in parsed &&
        (parsed as { version?: number }).version === 1
      ) {
        setBackupPreview(parsed as OpelleBackupV1);
        setImportStatus(null);
      } else {
        setBackupPreview(null);
        setImportStatus("Invalid backup format.");
      }
    } catch {
      setBackupPreview(null);
      setImportStatus("Unable to read backup file.");
    }
  };

  const handleImport = async () => {
    if (!backupPreview) return;
    const result = await importBackup(backupPreview, {
      merge: importMode === "merge",
    });
    setImportStatus(result.ok ? "Import complete." : result.error);
  };

  const handleReset = () => {
    if (resetConfirm !== "RESET") return;
    resetAll();
    setBackupPreview(null);
    setImportStatus("Local data cleared.");
    setResetConfirm("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-slate-300">
          Feature flags and environment status for this local shell.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Feature flags</h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Embedded AI
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.EMBEDDED_AI_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Metis Assist
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.METIS_ASSIST_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Client Portal
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.CLIENT_PORTAL_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Environment status</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <p>
            NEXT_PUBLIC_SUPABASE_URL: {supabaseUrlSet ? "set" : "missing"}
          </p>
          <p>
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseKeySet ? "set" : "missing"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Backup & Restore</h3>
        <p className="mt-1 text-sm text-slate-300">
          Export or import your local data as JSON.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-sm font-semibold text-slate-100">Export</h4>
            <p className="mt-2 text-xs text-slate-400">
              Download a JSON backup of clients, appointments, and formulas.
            </p>
            <button
              type="button"
              onClick={handleExport}
              className="mt-3 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Export backup
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-sm font-semibold text-slate-100">Import</h4>
            <p className="mt-2 text-xs text-slate-400">
              Choose a JSON file to restore or merge data.
            </p>
            <input
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="mt-3 block w-full text-xs text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:text-slate-100"
            />
            {backupPreview ? (
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                <p>Clients: {backupPreview.clients.length}</p>
                <p>Appointments: {backupPreview.appointments.length}</p>
                <p>Formulas: {backupPreview.formulas.length}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`rounded-full px-3 py-1 ${
                  importMode === "replace"
                    ? "bg-slate-100 text-slate-950"
                    : "border border-slate-700"
                }`}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setImportMode("merge")}
                className={`rounded-full px-3 py-1 ${
                  importMode === "merge"
                    ? "bg-slate-100 text-slate-950"
                    : "border border-slate-700"
                }`}
              >
                Merge
              </button>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={!backupPreview}
              className="mt-3 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import backup
            </button>
            {importStatus ? (
              <p className="mt-2 text-xs text-slate-400">{importStatus}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <h4 className="text-sm font-semibold text-rose-100">Reset local data</h4>
          <p className="mt-1 text-xs text-rose-200">
            This clears all saved clients, appointments, and formulas.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              placeholder="Type RESET to confirm"
              className="rounded-lg border border-rose-400/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-100"
            />
            <button
              type="button"
              onClick={handleReset}
              disabled={resetConfirm !== "RESET"}
              className="rounded-full border border-rose-300/60 px-4 py-2 text-xs text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset all
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
