import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Appointment } from "@/lib/models";
import {
  AppointmentRow,
  appointmentModelToRow,
  appointmentRowToModel,
} from "@/lib/db/types";

const requireUserId = async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated.");
  }
  return { supabase, userId: data.user.id };
};

export const listAppointments = async (): Promise<Appointment[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("start_at", { ascending: false });
  if (error) throw error;
  return (data as AppointmentRow[]).map(appointmentRowToModel);
};

export const getAppointment = async (id: string): Promise<Appointment | null> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
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
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      ...appointmentModelToRow({ ...input, stylist_id: userId }),
      stylist_id: userId,
    })
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
  const { supabase } = await requireUserId();
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
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
};
