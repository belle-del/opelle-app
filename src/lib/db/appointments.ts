import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Appointment } from "@/lib/models";
import {
  appointmentModelToRow,
  appointmentRowToModel,
  AppointmentRow,
} from "@/lib/db/types";

export const listAppointments = async (): Promise<Appointment[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data as AppointmentRow[]).map(appointmentRowToModel);
};

export const getAppointment = async (id: string): Promise<Appointment | null> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? appointmentRowToModel(data as AppointmentRow) : null;
};

export const createAppointment = async (input: Partial<Appointment>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert(appointmentModelToRow(input))
    .select("*")
    .single();
  if (error) throw error;
  return appointmentRowToModel(data as AppointmentRow);
};

export const updateAppointment = async (
  id: string,
  input: Partial<Appointment>
) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(appointmentModelToRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return appointmentRowToModel(data as AppointmentRow);
};

export const deleteAppointment = async (id: string) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
};
