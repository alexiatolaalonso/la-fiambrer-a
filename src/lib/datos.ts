import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Franja = T["franja"]["Row"];
export type Turno = T["turno"]["Row"];
export type Persona = T["persona"]["Row"];
export type Semana = T["semana"]["Row"];
export type Rol = Database["public"]["Enums"]["app_role"];

function ok<D>(r: { data: D | null; error: { message: string } | null }): D {
  if (r.error) throw new Error(r.error.message);
  return r.data as D;
}

export function useSesion() {
  return useQuery({
    queryKey: ["sesion"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const roles = ok(await supabase.from("user_roles").select("role")).map((r) => r.role as Rol);
      const persona = ok(await supabase.from("persona").select("*").ilike("email", user.email ?? "")).at(0) ?? null;
      const rol: Rol = roles.includes("admin") ? "admin" : roles.includes("encargado") ? "encargado" : "equipo";
      return { user, rol, persona, staff: rol !== "equipo" };
    },
  });
}

export function useCatalogo() {
  return useQuery({
    queryKey: ["catalogo"],
    queryFn: async () => {
      const [locales, puestos, personas, parametros, noDisp, tarifas, semanas] = await Promise.all([
        supabase.from("local").select("*").order("nombre"),
        supabase.from("puesto").select("*").order("nombre"),
        supabase.from("persona").select("*").order("alias"),
        supabase.from("parametros").select("*").maybeSingle(),
        supabase.from("no_disponible").select("*"),
        supabase.from("tarifa").select("*").order("vigente_desde", { ascending: false }),
        supabase.from("semana").select("*").order("id", { ascending: false }),
      ]);
      // El equipo solo ve su propia ficha completa; el resto llega como alias sin email.
      const completas = ok(personas);
      const alias = ok(await supabase.rpc("equipo_alias"));
      const todas: Persona[] = [
        ...completas,
        ...alias.filter((a) => !completas.some((c) => c.id === a.id))
          .map((a) => ({ id: a.id, alias: a.alias, email: "", locales: [], habilidades: [], tope_semanal: 0 })),
      ].sort((a, b) => a.alias.localeCompare(b.alias));
      return {
        locales: ok(locales), puestos: ok(puestos), personas: todas, parametros: ok(parametros),
        noDisp: ok(noDisp), tarifas: ok(tarifas), semanas: ok(semanas),
      };
    },
  });
}

export function useSemana(semanaId: string | undefined) {
  return useQuery({
    queryKey: ["semana", semanaId],
    enabled: !!semanaId,
    queryFn: async () => {
      const [semana, franjas, turnos] = await Promise.all([
        supabase.from("semana").select("*").eq("id", semanaId!).single(),
        supabase.from("franja").select("*").eq("semana_id", semanaId!).order("dia").order("inicio"),
        supabase.from("turno").select("*, franja!inner(semana_id)").eq("franja.semana_id", semanaId!).eq("estado", "activo"),
      ]);
      return { semana: ok(semana), franjas: ok(franjas), turnos: ok(turnos) as unknown as Turno[] };
    },
  });
}

/** Ejecuta un comando idempotente en el servidor. Lanza Error con el motivo si se rechaza. */
export async function ejecutar(tipo: string, datos: Record<string, unknown>, id: string = crypto.randomUUID()) {
  const { data, error } = await supabase.rpc("ejecutar_comando", { _id: id, _tipo: tipo, _datos: datos as Json });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; revision?: number; repetido?: boolean };
}

export function useRefrescar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function semanaPorDefecto(semanas: Semana[]): string | undefined {
  return (semanas.find((s) => s.estado === "abierta") ?? semanas[0])?.id;
}
