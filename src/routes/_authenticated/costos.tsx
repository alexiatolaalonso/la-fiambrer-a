import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SelectorSemana, etiquetaSemana } from "@/components/SelectorSemana";
import { supabase } from "@/integrations/supabase/client";
import { ejecutar, semanaPorDefecto, useCatalogo, useRefrescar, useSemana } from "@/lib/datos";
import { DIAS, construirCsv, descargar, estadoCobertura, hhmm, mxn, porcentaje, promedio, type FilaAjuste, type FilaCosto } from "@/lib/reglas";

export const Route = createFileRoute("/_authenticated/costos")({
  head: () => ({ meta: [{ title: "Panel de costos — La Fiambrería" }, { name: "description", content: "Horas, costo con prima dominical, horas extra y franjas flojas por semana." }, { property: "og:title", content: "Panel de costos — La Fiambrería" }, { property: "og:description", content: "Costos semanales de turnos." }] }),
  component: Costos,
});

function Costos() {
  const cat = useCatalogo();
  const [sel, setSel] = useState<string>();
  const semanaId = sel ?? semanaPorDefecto(cat.data?.semanas ?? []);
  const sem = useSemana(semanaId);
  const refrescar = useRefrescar();
  const costos = useQuery({
    queryKey: ["costos", semanaId, sem.data?.semana.revision],
    enabled: !!semanaId,
    queryFn: async () => {
      const [c, a] = await Promise.all([
        supabase.rpc("costos_semana", { _semana: semanaId! }),
        supabase.from("ajuste").select("*, turno(persona_id, franja(fecha))").eq("semana_id", semanaId!).order("creado_en"),
      ]);
      if (c.error) throw new Error(c.error.message);
      if (a.error) throw new Error(a.error.message);
      return { filas: c.data, ajustes: a.data };
    },
  });

  const loc = (id: string) => cat.data?.locales.find((l) => l.id === id)?.nombre ?? id;
  const pue = (id: string) => cat.data?.puestos.find((l) => l.id === id)?.nombre ?? id;
  const ali = (id: string) => cat.data?.personas.find((l) => l.id === id)?.alias ?? id;

  const datos = useMemo(() => {
    const filas: (FilaCosto & { turno_id: string; persona_id: string })[] = (costos.data?.filas ?? []).map((r) => ({
      turno_id: r.turno_id, persona_id: r.persona_id, alias: r.alias, fecha: r.fecha, local: loc(r.local_id), puesto: pue(r.puesto_id),
      inicio: r.inicio, fin: r.fin, horas: Number(r.horas), horas_extra: Number(r.horas_extra), tarifa: Number(r.tarifa), domingo: r.domingo, costo: Number(r.costo),
    }));
    const ajustes: (FilaAjuste & { persona_id: string })[] = (costos.data?.ajustes ?? []).map((a) => {
      const t = a.turno as unknown as { persona_id: string; franja: { fecha: string } } | null;
      return { persona_id: t?.persona_id ?? "", alias: ali(t?.persona_id ?? ""), fecha: t?.franja.fecha ?? "", horas: Number(a.horas), importe: Number(a.importe), motivo: a.motivo };
    });
    const porPersona = new Map<string, { alias: string; horas: number; extra: number; domingo: number; costo: number }>();
    for (const f of filas) {
      const p = porPersona.get(f.persona_id) ?? { alias: f.alias, horas: 0, extra: 0, domingo: 0, costo: 0 };
      p.horas += f.horas; p.extra += f.horas_extra; p.costo += f.costo; if (f.domingo) p.domingo += f.costo;
      porPersona.set(f.persona_id, p);
    }
    for (const a of ajustes) {
      const p = porPersona.get(a.persona_id) ?? { alias: a.alias, horas: 0, extra: 0, domingo: 0, costo: 0 };
      p.horas += a.horas; p.costo += a.importe; porPersona.set(a.persona_id, p);
    }
    const { csv, total } = construirCsv(filas, ajustes);
    return { filas, ajustes, porPersona: [...porPersona.values()].sort((a, b) => b.costo - a.costo), csv, total };
  }, [costos.data, cat.data]);

  const franjas = sem.data?.franjas ?? [];
  const turnos = sem.data?.turnos ?? [];
  const flojas = franjas.filter((f) => estadoCobertura(turnos.filter((t) => t.franja_id === f.id).length, f.cobertura_minima) === "floja");
  const conRequisito = franjas.filter((f) => f.cobertura_minima > 0);
  const cerrada = sem.data?.semana.estado === "cerrada";
  const horasExtra = datos.porPersona.reduce((a, p) => a + p.extra, 0);

  async function ajustar(turnoId: string) {
    const horas = prompt("Horas a corregir (negativo para descontar):", "-1");
    if (!horas || isNaN(Number(horas))) return;
    const motivo = prompt("Motivo de la corrección:");
    if (!motivo) return;
    try { await ejecutar("ajuste", { semana: semanaId, revision: sem.data!.semana.revision, turno: turnoId, horas: Number(horas), motivo }); toast.success("Ajuste registrado"); }
    catch (e) { toast.error((e as Error).message); }
    refrescar();
  }

  if (cat.isLoading || costos.isLoading) return <p className="text-muted-foreground">Cargando…</p>;
  if (costos.error) return <p className="text-peligro">{(costos.error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-4xl text-primary">Panel de costos</h1>
        <SelectorSemana semanas={cat.data!.semanas} valor={semanaId} onCambio={setSel} />
        <Button onClick={() => descargar(`costos-${semanaId}.csv`, datos.csv, "text/csv;charset=utf-8")}>Exportar CSV</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi titulo="Costo total" valor={mxn(datos.total)} />
        <Kpi titulo="Horas" valor={datos.filas.length ? String(datos.porPersona.reduce((a, p) => a + p.horas, 0)) : "—"} />
        <Kpi titulo="Horas extra" valor={datos.filas.length ? String(horasExtra) : "—"} alerta={horasExtra > 0} />
        <Kpi titulo="Cobertura" valor={porcentaje(conRequisito.length - flojas.length, conRequisito.length)} />
        <Kpi titulo="Horas promedio" valor={promedio(datos.porPersona.map((p) => p.horas))} />
      </div>
      {cerrada && <p className="text-sm text-muted-foreground">Semana cerrada: costos congelados con la tarifa vigente al cerrar. Las correcciones se registran como ajustes vinculados.</p>}

      <section className="pizarra overflow-x-auto p-3">
        <h2 className="text-2xl">Por persona</h2>
        {datos.porPersona.length === 0 ? <p className="text-sm text-muted-foreground">Sin turnos esta semana.</p> : (
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Persona</th><th>Horas</th><th>Extra</th><th>Domingo</th><th className="text-right">Costo</th></tr></thead>
            <tbody>
              {datos.porPersona.map((p) => (
                <tr key={p.alias} className="border-t border-border">
                  <td className="py-1 font-semibold">{p.alias}</td><td>{p.horas}</td>
                  <td className={p.extra ? "font-bold text-alerta" : ""}>{p.extra || "—"}</td>
                  <td>{p.domingo ? mxn(p.domingo) : "—"}</td><td className="text-right">{mxn(p.costo)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary font-bold"><td>Total</td><td /><td /><td /><td className="text-right">{mxn(datos.total)}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="pizarra p-3">
        <h2 className="text-2xl">Franjas flojas</h2>
        {conRequisito.length === 0 ? <p className="text-sm text-muted-foreground">No hay franjas con cobertura mínima.</p> : flojas.length === 0 ? <p className="text-sm text-ok">Todas cubiertas.</p> : (
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {flojas.map((f) => (
              <li key={f.id} className="rounded border-l-4 border-peligro bg-peligro/10 px-2 py-1 text-sm">
                {DIAS[f.dia]} {hhmm(f.inicio)}–{hhmm(f.fin)} · {f.etiqueta ?? pue(f.puesto_id)} · {loc(f.local_id)} — {turnos.filter((t) => t.franja_id === f.id).length}/{f.cobertura_minima}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pizarra overflow-x-auto p-3">
        <h2 className="text-2xl">Detalle {semanaId && `· ${etiquetaSemana(semanaId)}`}</h2>
        <table className="mt-2 w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Fecha</th><th>Persona</th><th>Puesto</th><th>Horas</th><th>Tarifa</th><th className="text-right">Costo</th>{cerrada && <th />}</tr></thead>
          <tbody>
            {datos.filas.map((f) => (
              <tr key={f.turno_id} className="border-t border-border">
                <td className="py-1">{f.fecha}{f.domingo && <span className="ml-1 rounded bg-alerta px-1 text-[10px] text-alerta-foreground">prima dom.</span>}</td>
                <td>{f.alias}</td><td>{f.puesto} · {f.local}</td>
                <td>{f.horas}{f.horas_extra > 0 && <span className="ml-1 text-alerta">(+{f.horas_extra} extra)</span>}</td>
                <td>{mxn(f.tarifa)}</td><td className="text-right">{mxn(f.costo)}</td>
                {cerrada && <td className="text-right"><button className="text-xs text-primary underline" onClick={() => ajustar(f.turno_id)}>Corregir</button></td>}
              </tr>
            ))}
            {datos.ajustes.map((a, i) => (
              <tr key={i} className="border-t border-border italic text-muted-foreground">
                <td className="py-1">{a.fecha}</td><td>{a.alias}</td><td>Ajuste: {a.motivo}</td><td>{a.horas}</td><td /><td className="text-right">{mxn(a.importe)}</td>{cerrada && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="pizarra p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className={`font-display text-3xl font-semibold ${alerta ? "text-alerta" : "text-primary"}`}>{valor}</div>
    </div>
  );
}
