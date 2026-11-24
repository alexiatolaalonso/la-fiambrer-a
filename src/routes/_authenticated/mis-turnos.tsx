import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ejecutar, semanaPorDefecto, useCatalogo, useRefrescar, useSesion } from "@/lib/datos";
import { DIAS_LARGOS, construirIcs, descargar, hhmm, textoTurnos, type EventoTurno } from "@/lib/reglas";

export const Route = createFileRoute("/_authenticated/mis-turnos")({
  head: () => ({ meta: [{ title: "Mis turnos — La Fiambrería" }, { name: "description", content: "Tus turnos de la semana, ausencias e intercambios." }, { property: "og:title", content: "Mis turnos — La Fiambrería" }, { property: "og:description", content: "Turnos personales." }] }),
  component: MisTurnos,
});

function MisTurnos() {
  const ses = useSesion();
  const cat = useCatalogo();
  const refrescar = useRefrescar();
  const yo = ses.data?.persona;
  const semanaAbierta = semanaPorDefecto(cat.data?.semanas ?? []);
  const [dialogo, setDialogo] = useState<"ausencia" | "intercambio" | null>(null);

  const q = useQuery({
    queryKey: ["mis-turnos", yo?.id],
    enabled: !!yo,
    queryFn: async () => {
      const [t, a, i] = await Promise.all([
        supabase.from("turno").select("*, franja(*)").eq("estado", "activo"),
        supabase.from("ausencia").select("*").order("creado_en", { ascending: false }),
        supabase.from("intercambio").select("*").order("creado_en", { ascending: false }),
      ]);
      if (t.error) throw new Error(t.error.message);
      return { turnos: (t.data ?? []).sort((x, y) => (x.franja!.ts_inicio! < y.franja!.ts_inicio! ? -1 : 1)), ausencias: a.data ?? [], intercambios: i.data ?? [] };
    },
  });

  if (ses.isLoading || cat.isLoading || q.isLoading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!yo) return <p>Esta cuenta no está vinculada a una persona del equipo.</p>;

  const loc = (id: string) => cat.data?.locales.find((l) => l.id === id)?.nombre ?? id;
  const pue = (id: string) => cat.data?.puestos.find((l) => l.id === id)?.nombre ?? id;
  const ali = (id: string) => cat.data?.personas.find((l) => l.id === id)?.alias ?? id;
  const turnos = q.data?.turnos ?? [];
  const eventos: EventoTurno[] = turnos.map((t) => ({ id: t.id, fecha: t.franja!.fecha!, inicio: t.franja!.inicio, fin: t.franja!.fin, titulo: t.franja!.etiqueta ?? pue(t.franja!.puesto_id), lugar: loc(t.franja!.local_id) }));
  const texto = textoTurnos(yo.alias, eventos);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl text-primary">Mis turnos · {yo.alias}</h1>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialogo("ausencia")}>Pedir ausencia</Button>
        <Button variant="outline" onClick={() => setDialogo("intercambio")}>Proponer intercambio</Button>
        <Button variant="outline" onClick={() => descargar("mis-turnos.ics", construirIcs(eventos), "text/calendar")}>Descargar .ics</Button>
        <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(texto); toast.success("Texto copiado"); }}>Copiar texto</Button>
        <Button variant="outline" onClick={async () => {
          if (navigator.share) { try { await navigator.share({ title: "Mis turnos", text: texto }); } catch { /* cancelado */ } }
          else { await navigator.clipboard.writeText(texto); toast("Texto listo en el portapapeles para pegarlo donde quieras"); }
        }}>Compartir</Button>
      </div>

      <section className="pizarra divide-y divide-border">
        {turnos.length === 0 && <p className="p-3 text-sm text-muted-foreground">No tienes turnos asignados.</p>}
        {turnos.map((t) => {
          const f = t.franja!;
          return (
            <div key={t.id} className="flex flex-wrap items-baseline gap-x-3 p-3">
              <span className="w-28 font-semibold text-primary">{DIAS_LARGOS[f.dia]} {f.fecha!.slice(8)}</span>
              <span className="font-semibold">{hhmm(f.inicio)}–{hhmm(f.fin)}</span>
              <span>{f.etiqueta ?? pue(f.puesto_id)}</span>
              <span className="text-sm text-muted-foreground">{loc(f.local_id)}</span>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="pizarra p-3">
          <h2 className="text-2xl">Mis ausencias</h2>
          {(q.data?.ausencias ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Ninguna.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{q.data!.ausencias.map((a) => <li key={a.id}>{DIAS_LARGOS[a.dia]} ({a.semana_id}) · {a.motivo || "sin motivo"} — <Estado e={a.estado} /></li>)}</ul>
          )}
        </div>
        <div className="pizarra p-3">
          <h2 className="text-2xl">Intercambios</h2>
          {(q.data?.intercambios ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Ninguno.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{q.data!.intercambios.map((i) => <li key={i.id}>{ali(i.persona_a)} → {ali(i.persona_b)} — <Estado e={i.estado} />{i.motivo_rechazo && ` (${i.motivo_rechazo})`}</li>)}</ul>
          )}
        </div>
      </section>

      <Dialog open={dialogo === "ausencia"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pedir ausencia</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            try { await ejecutar("pedir_ausencia", { semana: semanaAbierta, dia: String(fd.get("dia")), motivo: String(fd.get("motivo") ?? "") }); toast.success("Solicitud enviada"); setDialogo(null); }
            catch (err) { toast.error((err as Error).message); }
            refrescar();
          }}>
            <label className="block text-sm">Día<select name="dia" className="mt-1 h-9 w-full rounded border border-input bg-card px-2">{DIAS_LARGOS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <label className="block text-sm">Motivo<input name="motivo" maxLength={300} className="mt-1 h-9 w-full rounded border border-input bg-card px-2" /></label>
            <Button type="submit">Enviar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Intercambio abierto={dialogo === "intercambio"} cerrar={() => setDialogo(null)} turnos={eventos} semana={semanaAbierta} onListo={refrescar} />
    </div>
  );
}

function Estado({ e }: { e: string }) {
  const c = e.startsWith("aprob") ? "text-ok" : e.startsWith("rechaz") ? "text-peligro" : "text-alerta-foreground bg-alerta/40 px-1 rounded";
  return <span className={`font-semibold ${c}`}>{e}</span>;
}

function Intercambio({ abierto, cerrar, turnos, semana, onListo }: {
  abierto: boolean; cerrar: () => void; turnos: EventoTurno[]; semana: string | undefined; onListo: () => void;
}) {
  const [turnoA, setTurnoA] = useState("");
  const [personaB, setPersonaB] = useState("");
  const miTurno = turnoA || turnos[0]?.id || "";
  const personas = useQuery({
    queryKey: ["companeros", miTurno],
    enabled: !!miTurno && abierto,
    queryFn: async () => (await supabase.rpc("companeros_intercambio", { _turno: miTurno })).data ?? [],
  });
  const susTurnos = useQuery({
    queryKey: ["intercambiables", personaB, miTurno],
    enabled: !!personaB && !!miTurno,
    queryFn: async () => (await supabase.rpc("turnos_intercambiables_compatibles", { _persona: personaB, _turno_ref: miTurno })).data ?? [],
  });
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Proponer intercambio</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await ejecutar("proponer_intercambio", { semana, turno_a: String(fd.get("turno_a")), persona_b: personaB, turno_b: String(fd.get("turno_b") ?? ""), nota: String(fd.get("nota") ?? "") });
            toast.success("Propuesta enviada al encargado"); cerrar();
          } catch (err) { toast.error((err as Error).message); }
          onListo();
        }}>
          <label className="block text-sm">Mi turno<select required name="turno_a" value={miTurno} onChange={(e) => { setTurnoA(e.target.value); setPersonaB(""); }} className="mt-1 h-9 w-full rounded border border-input bg-card px-2">{turnos.map((t) => <option key={t.id} value={t.id}>{t.fecha} {hhmm(t.inicio)} {t.titulo}</option>)}</select></label>
          <label className="block text-sm">Con<select required value={personaB} onChange={(e) => setPersonaB(e.target.value)} className="mt-1 h-9 w-full rounded border border-input bg-card px-2"><option value="">Elige…</option>{(personas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}</select></label>
          <p className="text-xs text-muted-foreground">Solo con compañeros del mismo local (o de ambos) y la misma posición.</p>
          {personas.isSuccess && personas.data.length === 0 && <p className="text-sm text-peligro">Nadie más trabaja en el local de este turno.</p>}
          {personaB && (
            <label className="block text-sm">Su turno (opcional; vacío = te cubre)<select name="turno_b" className="mt-1 h-9 w-full rounded border border-input bg-card px-2"><option value="">— Solo me cubre —</option>{(susTurnos.data ?? []).map((t) => <option key={t.turno_id} value={t.turno_id}>{t.fecha} {hhmm(t.inicio)} {t.puesto} · {t.local}</option>)}</select></label>
          )}
          <label className="block text-sm">Nota<input name="nota" maxLength={300} className="mt-1 h-9 w-full rounded border border-input bg-card px-2" /></label>
          <Button type="submit" disabled={!turnos.length}>Enviar propuesta</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
