import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Formula } from "@/lib/models";
import { formulaModelToRow, formulaRowToModel, FormulaRow } from "@/lib/db/types";

export const listFormulas = async (): Promise<Formula[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formulas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as FormulaRow[]).map(formulaRowToModel);
};

export const getFormula = async (id: string): Promise<Formula | null> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formulas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? formulaRowToModel(data as FormulaRow) : null;
};

export const createFormula = async (input: Partial<Formula>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formulas")
    .insert(formulaModelToRow(input))
    .select("*")
    .single();
  if (error) throw error;
  return formulaRowToModel(data as FormulaRow);
};

export const updateFormula = async (id: string, input: Partial<Formula>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formulas")
    .update(formulaModelToRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return formulaRowToModel(data as FormulaRow);
};

export const deleteFormula = async (id: string) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("formulas").delete().eq("id", id);
  if (error) throw error;
};
