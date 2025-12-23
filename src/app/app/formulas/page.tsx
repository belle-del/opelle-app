"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Formula, FormulaInput } from "@/lib/models";
import { deleteFormula, listFormulas, saveFormula } from "@/lib/storage";
import Modal from "@/app/app/_components/Modal";

const emptyForm: FormulaInput = {
  clientName: "",
  service: "",
  colorLine: "",
  grams: 0,
  developer: "",
  processingTime: "",
  notes: "",
};

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [form, setForm] = useState<FormulaInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();

  const refreshFormulas = () => {
    setFormulas(listFormulas());
  };

  useEffect(() => {
    refreshFormulas();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(emptyForm);
      setModalOpen(true);
    }
  }, [searchParams]);

  const handleChange = (
    field: keyof FormulaInput,
    value: string | number | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientName.trim() || !form.service.trim()) return;

    saveFormula({
      ...form,
      clientName: form.clientName.trim(),
      service: form.service.trim(),
      colorLine: form.colorLine.trim(),
      developer: form.developer.trim(),
      processingTime: form.processingTime.trim(),
      notes: form.notes?.trim() || undefined,
      grams: Number(form.grams) || 0,
    });
    refreshFormulas();
    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = (formula: Formula) => {
    setForm({
      id: formula.id,
      clientName: formula.clientName,
      service: formula.service,
      colorLine: formula.colorLine,
      grams: formula.grams,
      developer: formula.developer,
      processingTime: formula.processingTime,
      notes: formula.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleDelete = (formulaId: string) => {
    if (!confirm("Delete this formula?")) return;
    deleteFormula(formulaId);
    refreshFormulas();
  };

  const filteredFormulas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return formulas;
    return formulas.filter((formula) =>
      [formula.clientName, formula.service, formula.colorLine]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [formulas, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Formulas</h2>
          <p className="text-slate-300">
            Track formula details and color mixes locally.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          New formula
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
        placeholder="Search by client, service, or color line"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredFormulas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No formulas yet. Add a new formula to keep reference notes.
          </div>
        ) : (
          filteredFormulas.map((formula) => (
            <div
              key={formula.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    {formula.clientName}
                  </p>
                  <p className="text-sm text-slate-400">
                    {formula.service}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(formula)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(formula.id)}
                    className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>Color line: {formula.colorLine}</p>
                <p>Grams: {formula.grams}</p>
                <p>Developer: {formula.developer}</p>
                <p>Processing time: {formula.processingTime}</p>
                {formula.notes ? (
                  <p className="text-slate-400">Notes: {formula.notes}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? "Edit formula" : "New formula"}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Client
              <input
                value={form.clientName}
                onChange={(event) =>
                  handleChange("clientName", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm text-slate-200">
              Service
              <input
                value={form.service}
                onChange={(event) => handleChange("service", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <label className="block text-sm text-slate-200">
            Color line
            <input
              value={form.colorLine}
              onChange={(event) => handleChange("colorLine", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              required
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-slate-200">
              Grams
              <input
                type="number"
                min={0}
                value={form.grams}
                onChange={(event) =>
                  handleChange("grams", Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Developer
              <input
                value={form.developer}
                onChange={(event) => handleChange("developer", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Processing time
              <input
                value={form.processingTime}
                onChange={(event) =>
                  handleChange("processingTime", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm text-slate-200">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Save formula
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
