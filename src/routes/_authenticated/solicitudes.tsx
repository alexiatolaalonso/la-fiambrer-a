import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ejecutar, useCatalogo, useRefrescar } from "@/lib/datos";
import { DIAS_LARGOS, etiquetaAusencia, hhmm } from "@/lib/reglas";

export const Route = createFileRoute("/_authenticated/solicitudes")({
  head: () => ({ meta: [{ title: "Solicitudes — La Fiambrería" }, { name: "description", content: "Aprueba o rechaza ausencias e intercambios de turno." }, { property: "og:title", content: "Solicitudes — La Fiambrería" }, { property: "og:description", content: "Ausencias e intercambios." }] }),
  component: Solicitudes,
});

function Solicitudes() {
  const cat = useCatalogo();
  const refrescar = useRefrescar();
  const q = useQuery({
    queryKey: ["solicitudes"],
    queryFn: async () => {
      const [a, i, t] = await Promise.all([
        supabase.from("ausencia").select("*").order("creado_en", { ascending: false }),
        supabase.from("intercambio").select("*").order("creado_en", { ascending: false }),
        supabase.from("turno").select("id, persona_id, franja(fecha, inicio, fin, puesto_id, local_id, etiqueta)"),
      ]);
      return { ausencias: a.data ?? [], intercambios: i.data ?? [], turnos: t.data ?? [] };
    },
  });
  const ali = (id: string) => cat.data?.personas.find((p) => p.id === id)?.alias ?? id;
  const pue = (id: string) => cat.data?.puestos.find((p) => p.id === id)?.nombre ?? id;
  const rev = (semana: string) => cat.data?.semanas.find((s) => s.id === semana)?.revision;
  const desc = (id: string | null) => {
    const t = q.data?.turnos.find((x) => x.id === id);
    const f = t?.franja as { fecha: string; inicio: string; fin: string; puesto_id: string; etiqueta: string | null } | null;
    return f ? `${f.fecha} ${hhmm(f.inicio)}–${hhmm(f.fin)} ${f.etiqueta ?? pue(f.puesto_id)}` : "";
  };

  async function resolver(tipo: "resolver_ausencia" | "resolver_intercambio", campo: string, id: string, semana: string, aprobar: boolean) {
    let motivo: string | null = null;
    if (!aprobar) { motivo = prompt("Motivo del rechazo (opcional):") ?? ""; }
    try {
      await ejecutar(tipo, { semana, revision: rev(semana), [campo]: id, aprobar, motivo });
      toast.success(aprobar ? "Aprobada" : "Rechazada");
    } catch (e) { toast.error(`No se aplicó ningún cambio — ${(e as Error).message}`); }
    refrescar();
  }

  if (q.isLoading || cat.isLoading) return <p className="text-muted-foreground">Cargando…</p>;
  const pendA = q.data!.ausencias.filter((a) => a.estado === "pendiente");
  const pendI = q.data!.intercambios.filter((i) => i.estado === "pendiente");

  return (
    <div className="space-y-5">
      <h1 className="text-4xl text-primary">Solicitudes</h1>
      <section className="pizarra p-3">
        <h2 className="text-2xl">Ausencias pendientes</h2>
        {pendA.length === 0 ? <p className="text-sm text-muted-foreground">Nada pendiente.</p> : pendA.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 border-t border-border py-2 first:border-0">
            <span className="font-semibold">{ali(a.persona_id)}</span>
            <span>{etiquetaAusencia(a.semana_id, a.dia, a.franja)}</span>
            <span className="text-sm text-muted-foreground">{a.motivo}</span>
            <span className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => resolver("resolver_ausencia", "ausencia", a.id, a.semana_id, true)}>Aprobar</Button>
              <Button size="sm" variant="outline" onClick={() => resolver("resolver_ausencia", "ausencia", a.id, a.semana_id, false)}>Rechazar</Button>
            </span>
          </div>
        ))}
        <p className="mt-2 text-xs text-muted-foreground">Aprobar libera los turnos de ese día como franjas a cubrir.</p>
      </section>
      <section className="pizarra p-3">
        <h2 className="text-2xl">Intercambios pendientes</h2>
        {pendI.length === 0 ? <p className="text-sm text-muted-foreground">Nada pendiente.</p> : pendI.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-2 border-t border-border py-2 first:border-0">
            <span><b>{ali(i.persona_a)}</b> cede {desc(i.turno_a)} a <b>{ali(i.persona_b)}</b>{i.turno_b && <> a cambio de {desc(i.turno_b)}</>}</span>
            {i.nota && <span className="text-sm text-muted-foreground">«{i.nota}»</span>}
            <span className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => resolver("resolver_intercambio", "intercambio", i.id, i.semana_id, true)}>Aprobar</Button>
              <Button size="sm" variant="outline" onClick={() => resolver("resolver_intercambio", "intercambio", i.id, i.semana_id, false)}>Rechazar</Button>
            </span>
          </div>
        ))}
        <p className="mt-2 text-xs text-muted-foreground">Solo se aprueba si ambas personas siguen cumpliendo descanso, disponibilidad y habilidades.</p>
      </section>
      <section className="pizarra p-3">
        <h2 className="text-2xl">Historial</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {q.data!.ausencias.filter((a) => a.estado !== "pendiente").map((a) => <li key={a.id}>Ausencia {ali(a.persona_id)} {etiquetaAusencia(a.semana_id, a.dia, a.franja)} — {a.estado}</li>)}
          {q.data!.intercambios.filter((i) => i.estado !== "pendiente").map((i) => <li key={i.id}>Intercambio {ali(i.persona_a)} → {ali(i.persona_b)} — {i.estado}</li>)}
        </ul>
      </section>
    </div>
  );
}
