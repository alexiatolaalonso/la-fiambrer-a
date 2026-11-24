import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SelectorSemana } from "@/components/SelectorSemana";
import { ejecutar, semanaPorDefecto, useCatalogo, useRefrescar, useSemana, type Franja } from "@/lib/datos";
import { DIAS, addDias, diasDescansoFaltante, estadoCobertura, hhmm, horasFranja } from "@/lib/reglas";
import { cn } from "@/lib/utils";
import { HabilidadesIconos } from "@/components/HabilidadesIconos";

export const Route = createFileRoute("/_authenticated/planificador")({
  head: () => ({ meta: [{ title: "Planificador semanal — La Fiambrería" }, { name: "description", content: "Asigna personas a franjas con validación de descanso, disponibilidad y habilidades." }, { property: "og:title", content: "Planificador semanal — La Fiambrería" }, { property: "og:description", content: "Grilla semanal de turnos." }] }),
  component: Planificador,
});

function Planificador() {
  const cat = useCatalogo();
  const [sel, setSel] = useState<string>();
  const semanaId = sel ?? semanaPorDefecto(cat.data?.semanas ?? []);
  const sem = useSemana(semanaId);
  const refrescar = useRefrescar();
  const [elegida, setElegida] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<{ franja: string; motivo: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const personas = cat.data?.personas ?? [];
  const alias = (id: string) => personas.find((p) => p.id === id)?.alias ?? id;
  const franjas = sem.data?.franjas ?? [];
  const turnos = sem.data?.turnos ?? [];
  const cerrada = sem.data?.semana.estado === "cerrada";

  const filas = useMemo(() => {
    const m = new Map<string, { key: string; local: string; puesto: string; inicio: string; fin: string; etiqueta: string | null; porDia: Map<number, Franja[]> }>();
    for (const f of franjas) {
      const key = `${f.local_id}|${f.puesto_id}|${f.inicio}|${f.fin}|${f.etiqueta ?? ""}`;
      if (!m.has(key)) m.set(key, { key, local: f.local_id, puesto: f.puesto_id, inicio: f.inicio, fin: f.fin, etiqueta: f.etiqueta, porDia: new Map() });
      const fila = m.get(key)!;
      fila.porDia.set(f.dia, [...(fila.porDia.get(f.dia) ?? []), f]);
    }
    return [...m.values()].sort((a, b) => a.local.localeCompare(b.local) * -1 || a.inicio.localeCompare(b.inicio) || a.puesto.localeCompare(b.puesto));
  }, [franjas]);

  const resumen = useMemo(() => {
    const max = cat.data?.parametros?.max_dias_seguidos ?? 6;
    return personas.map((p) => {
      const mios = turnos.filter((t) => t.persona_id === p.id).map((t) => franjas.find((f) => f.id === t.franja_id)).filter(Boolean) as Franja[];
      const horas = mios.reduce((a, f) => a + horasFranja(f.inicio, f.fin), 0);
      const fechas = mios.map((f) => f.fecha!);
      return { p, horas, fechas, faltante: diasDescansoFaltante(fechas, max) };
    });
  }, [personas, turnos, franjas, cat.data?.parametros]);

  async function asignar(personaId: string, franjaId: string) {
    if (!sem.data || cerrada || ocupado) return;
    setOcupado(true);
    try {
      await ejecutar("asignar", { semana: semanaId, revision: sem.data.semana.revision, franja: franjaId, persona: personaId });
      setRechazo(null);
      toast.success(`${alias(personaId)} asignada`);
    } catch (e) {
      const motivo = (e as Error).message;
      setRechazo({ franja: franjaId, motivo: `${alias(personaId)}: ${motivo}` });
      toast.error(`Rechazado — ${motivo}`);
    } finally {
      setOcupado(false);
      refrescar();
    }
  }
  async function quitar(turnoId: string) {
    if (!sem.data) return;
    try { await ejecutar("quitar", { semana: semanaId, revision: sem.data.semana.revision, turno: turnoId }); }
    catch (e) { toast.error((e as Error).message); }
    refrescar();
  }
  async function cerrar() {
    if (!sem.data || !confirm("¿Cerrar la semana? Quedará en solo lectura y se congelan los costos.")) return;
    try { await ejecutar("cerrar_semana", { semana: semanaId, revision: sem.data.semana.revision }); toast.success("Semana cerrada"); }
    catch (e) { toast.error((e as Error).message); }
    refrescar();
  }

  if (cat.isLoading || sem.isLoading) return <p className="text-muted-foreground">Cargando pizarra…</p>;
  if (!semanaId || !sem.data) return <p>No hay semanas.</p>;

  const colorLocal = (id: string) => {
    const ls = personas.find((p) => p.id === id)?.locales ?? [];
    const t = ls.includes("tienda"), w = ls.includes("winebar");
    return t && w ? "border-l-tienda border-r-winebar border-l-4 border-r-4" : t ? "border-l-4 border-l-tienda" : w ? "border-l-4 border-l-winebar" : "";
  };
  const tipoLocal = (id: string) => {
    const ls = personas.find((p) => p.id === id)?.locales ?? [];
    const t = ls.includes("tienda"), w = ls.includes("winebar");
    return t && w ? "ambos" : t ? "tienda" : w ? "winebar" : null;
  };
  const nombreLocal = (id: string) => cat.data?.locales.find((l) => l.id === id)?.nombre ?? id;
  const nombrePuesto = (id: string) => cat.data?.puestos.find((l) => l.id === id)?.nombre ?? id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-4xl text-primary">Planificador semanal</h1>
        <SelectorSemana semanas={cat.data!.semanas} valor={semanaId} onCambio={(v) => { setSel(v); setRechazo(null); }} />
        <span className="text-xs text-muted-foreground">rev. {sem.data.semana.revision}</span>
        {cerrada ? (
          <span className="rounded bg-muted px-3 py-2 text-sm font-semibold">Semana cerrada · solo lectura</span>
        ) : (
          <Button onClick={cerrar}>Cerrar semana</Button>
        )}
      </div>

      {rechazo && (
        <div role="alert" className="rounded-md border-l-4 border-peligro bg-peligro/10 px-4 py-2 text-sm">
          <strong className="text-peligro">Rechazado:</strong> «{rechazo.motivo}»
        </div>
      )}

      {!cerrada && (
        <section className="pizarra p-3" aria-label="Equipo">
          <p className="mb-2 text-xs text-muted-foreground">
            Arrastra una persona a una franja, o selecciónala (Enter) y luego pulsa «Asignar aquí» en la franja.
          </p>
          <div className="flex flex-wrap gap-2">
            {resumen.map(({ p, horas, fechas, faltante }) => (
              <button
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/persona", p.id)}
                onClick={() => setElegida(elegida === p.id ? null : p.id)}
                aria-pressed={elegida === p.id}
                className={cn("relative overflow-hidden rounded-md border px-2 pb-1 pt-2.5 text-left text-sm",
                  elegida === p.id ? "border-primary bg-primary text-primary-foreground" :
                  cn("border-border hover:bg-accent", { tienda: "bg-tienda/10", winebar: "bg-winebar/10", ambos: "bg-gradient-to-r from-tienda/10 to-winebar/10" }[tipoLocal(p.id) ?? "tienda"] ?? "bg-background"))}
              >
                <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5", { tienda: "bg-tienda", winebar: "bg-winebar", ambos: "bg-gradient-to-r from-tienda from-50% to-winebar to-50%" }[tipoLocal(p.id) ?? "tienda"])} />
                <span className="font-semibold">{p.alias}</span>
                <HabilidadesIconos habilidades={p.habilidades} className="ml-1 align-[-2px]" iconClass="text-inherit" />
                <span className={cn("ml-1 text-[10px] font-semibold", elegida === p.id ? "" : tipoLocal(p.id) === "winebar" ? "text-winebar" : "text-tienda")}>{{ tienda: "Tienda", winebar: "Wine Bar", ambos: "Ambos" }[tipoLocal(p.id) ?? "tienda"]}</span>
                <span className={cn("ml-1 text-xs", horas > Number(p.tope_semanal) ? "text-alerta font-bold" : "opacity-70")}>{horas}h/{Number(p.tope_semanal)}</span>
                <span className="mt-1 flex gap-0.5" aria-label={`Días trabajados de ${p.alias}`}>
                  {DIAS.map((d, i) => {
                    const f = addDias(semanaId, i);
                    const trabaja = fechas.includes(f);
                    const falta = faltante.includes(f);
                    return <span key={d} title={falta ? `${d}: falta descanso` : d} className={cn("h-1.5 w-3 rounded-sm", trabaja ? "bg-ok" : falta ? "bg-peligro" : "bg-muted-foreground/25")} />;
                  })}
                </span>
                {faltante.some((f) => f <= addDias(semanaId, 6)) && <span className="block text-[10px] font-semibold text-peligro">Descanso obligatorio: {faltante.map((f) => DIAS[(new Date(f + "T12:00").getDay() + 6) % 7]).join(", ")}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="overflow-x-auto pizarra">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="sticky left-0 z-10 bg-primary px-2 py-2 text-left">Franja</th>
              {DIAS.map((d, i) => (
                <th key={d} className="px-2 py-2 text-left font-semibold">{d} <span className="font-normal opacity-75">{addDias(semanaId, i).slice(8)}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.key} className="border-t border-border align-top">
                <th scope="row" className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-normal">
                  <div className="font-semibold">{fila.etiqueta ?? nombrePuesto(fila.puesto)}</div>
                  <div className="text-xs text-muted-foreground">{nombreLocal(fila.local)} · {hhmm(fila.inicio)}–{hhmm(fila.fin)}</div>
                </th>
                {DIAS.map((_, dia) => {
                  const fs = fila.porDia.get(dia) ?? [];
                  if (!fs.length) return <td key={dia} className="bg-muted/40" />;
                  return (
                    <td key={dia} className="p-1">
                      {fs.map((f) => {
                        const asignados = turnos.filter((t) => t.franja_id === f.id);
                        const est = estadoCobertura(asignados.length, f.cobertura_minima);
                        return (
                          <div
                            key={f.id}
                            onDragOver={(e) => { if (!cerrada) e.preventDefault(); }}
                            onDrop={(e) => { const p = e.dataTransfer.getData("text/persona"); if (p) asignar(p, f.id); }}
                            className={cn("min-h-16 rounded border-2 p-1",
                              est === "completa" ? "border-ok bg-ok/10" : est === "floja" ? "border-peligro bg-peligro/10" : "border-border")}
                          >
                            <div className={cn("text-[11px] font-semibold", est === "completa" ? "text-ok" : "text-peligro")}>
                              {asignados.length}/{f.cobertura_minima} {est === "floja" ? "· falta cubrir" : ""}
                            </div>
                            <ul className="space-y-0.5">
                              {asignados.map((t) => (
                                <li key={t.id} className={cn("flex items-center justify-between gap-1 rounded bg-background px-1", colorLocal(t.persona_id))}>
                                  <span>{alias(t.persona_id)}</span>
                                  {!cerrada && <button aria-label={`Quitar a ${alias(t.persona_id)}`} onClick={() => quitar(t.id)} className="text-muted-foreground hover:text-peligro">×</button>}
                                </li>
                              ))}
                            </ul>
                            {rechazo?.franja === f.id && <p className="mt-1 text-[11px] font-semibold text-peligro">{rechazo.motivo}</p>}
                            {!cerrada && elegida && (
                              <button onClick={() => asignar(elegida, f.id)} className="mt-1 w-full rounded border border-dashed border-primary text-[11px] text-primary hover:bg-primary/10">
                                Asignar aquí
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block h-3 w-1 bg-tienda align-middle" />Tienda</span>
        <span><span className="mr-1 inline-block h-3 w-1 bg-winebar align-middle" />Wine Bar</span>
        <span><span className="mr-1 inline-block h-3 w-1 bg-tienda align-middle" /><span className="mr-1 inline-block h-3 w-1 bg-winebar align-middle" />Ambos locales</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-sm border-2 border-ok bg-ok/10 align-middle" />Cobertura completa</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-sm border-2 border-peligro bg-peligro/10 align-middle" />Bajo cobertura mínima</span>
        <span><span className="mr-1 inline-block h-1.5 w-3 rounded-sm bg-peligro align-middle" />Día de descanso faltante</span>
      </p>
    </div>
  );
}
