"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "opelle:client:v1:intake";

type IntakeForm = {
  name: string;
  pronouns: string;
  phone: string;
  email: string;
  allergies: string;
  goals: string;
  savedAt?: string;
};

const buildEmptyForm = (): IntakeForm => ({
  name: "",
  pronouns: "",
  phone: "",
  email: "",
  allergies: "",
  goals: "",
});

const safeParse = (value: string | null): IntakeForm | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as IntakeForm;
  } catch {
    return null;
  }
};

export default function ClientIntakePage() {
  const [form, setForm] = useState<IntakeForm>(buildEmptyForm());
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setForm(stored);
      setIsSaved(true);
      setIsEditing(false);
    }
  }, []);

  const handleChange = (field: keyof IntakeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const payload: IntakeForm = {
      ...form,
      name: form.name.trim(),
      pronouns: form.pronouns.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      allergies: form.allergies.trim(),
      goals: form.goals.trim(),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setForm(payload);
    setIsSaved(true);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Intake form</h2>
        <p className="text-slate-300">
          Share the details your stylist needs before your visit.
        </p>
      </div>

      {isSaved && !isEditing ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm text-emerald-100">
            Intake received. You can update this anytime.
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Summary
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Name</p>
                <p>{form.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pronouns</p>
                <p>{form.pronouns || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p>{form.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p>{form.email || "Not provided"}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-400">Allergies</p>
              <p>{form.allergies || "None listed"}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-400">Goals</p>
              <p>{form.goals || "No goals added yet"}</p>
            </div>
            {form.savedAt ? (
              <p className="mt-4 text-xs text-slate-500">
                Saved {new Date(form.savedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Edit answers
            </button>
            <Link
              href="/client"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Back to portal
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Name
              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm text-slate-200">
              Pronouns (optional)
              <input
                value={form.pronouns}
                onChange={(event) =>
                  handleChange("pronouns", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Phone (optional)
              <input
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Email (optional)
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm text-slate-200">
            Allergies or sensitivities
            <textarea
              value={form.allergies}
              onChange={(event) =>
                handleChange("allergies", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <label className="mt-4 block text-sm text-slate-200">
            Hair/Nail goals
            <textarea
              value={form.goals}
              onChange={(event) => handleChange("goals", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              rows={4}
            />
          </label>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {isSaved ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Submit intake
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
