import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelectorSemana } from "@/components/SelectorSemana";
import { supabase } from "@/integrations/supabase/client";
import { ejecutar, semanaPorDefecto, useCatalogo, useRefrescar, useSemana, useSesion, type Persona } from "@/lib/datos";
import { HabilidadesIconos } from "@/components/HabilidadesIconos";
import { DIAS, hhmm, mxn } from "@/lib/reglas";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — La Fiambrería" }, { name: "description", content: "Locales, puestos, franjas, tarifas versionadas y reglas de descanso." }, { property: "og:title", content: "Configuración — La Fiambrería" }, { property: "og:description", content: "Configuración del planificador." }] }),
  component: Configuracion,
});

const input = "h-9 rounded border border-input bg-card px-2 text-sm";

function useGuardar() {
  const refrescar = useRefrescar();
  return async (p: PromiseLike<{ error: { message: string } | null }>, ok = "Guardado") => {
    const { error } = await p;
    if (error) toast.error(error.message); else toast.success(ok);
    refrescar();
  };
}
const fd = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); e.currentTarget.reset(); return (k: string) => String(f.get(k) ?? "").trim(); };

function Configuracion() {
  const cat = useCatalogo();
  const ses = useSesion();
  const guardar = useGuardar();
  const refrescar = useRefrescar();
  if (cat.isLoading || !cat.data) return <p className="text-muted-foreground">Cargando…</p>;
  const { locales, puestos } = cat.data;
  const staff = !!ses.data?.staff;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-4xl text-primary">Configuración</h1>
        <Button variant="destructive" onClick={async () => {
          if (!confirm("¿Reiniciar todos los datos de ejemplo? Se perderán los cambios.")) return;
          try { await ejecutar("reiniciar", {}); toast.success("Datos reiniciados"); } catch (e) { toast.error((e as Error).message); }
          refrescar();
        }}>Reiniciar datos</Button>
      </div>
      <Tabs defaultValue="franjas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="franjas">Franjas</TabsTrigger>
          <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
          <TabsTrigger value="locales">Locales</TabsTrigger>
          <TabsTrigger value="puestos">Puestos</TabsTrigger>
        </TabsList>

        <TabsContent value="personal"><Personal /></TabsContent>
        <TabsContent value="franjas"><Franjas /></TabsContent>

        <TabsContent value="tarifas" className="pizarra p-3 space-y-3">
          {staff && (
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { const g = fd(e); guardar(supabase.from("tarifa").insert({ puesto_id: g("puesto"), importe: Number(g("importe")), vigente_desde: g("desde") }), "Nueva tarifa registrada"); }}>
              <select name="puesto" className={input}>{puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
              <input name="importe" type="number" min="1" step="0.01" required placeholder="Importe por hora" className={input} />
              <input name="desde" type="date" required className={input} />
              <Button type="submit">Agregar versión</Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">Las tarifas no se editan: cada cambio crea una versión nueva. Los turnos ya asignados conservan su tarifa.</p>
          {puestos.map((p) => (
            <div key={p.id}>
              <h3 className="text-xl">{p.nombre}</h3>
              <ul className="text-sm">{tarifasDe(cat.data.tarifas, p.id).map((t, i) => (
                <li key={t.id} className={i === 0 ? "font-semibold" : "text-muted-foreground"}>{mxn(Number(t.importe))}/h desde {t.vigente_desde}{i === 0 && " (más reciente)"}</li>
              ))}</ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="parametros" className="pizarra p-3">
          <Parametros />
        </TabsContent>

        <TabsContent value="locales" className="pizarra p-3 space-y-2">
          {locales.map((l) => <FilaLocal key={l.id} l={l} staff={staff} guardar={guardar} />)}
          {staff && <form className="flex gap-2 border-t border-border pt-2" onSubmit={(e) => { const g = fd(e); guardar(supabase.from("local").insert({ id: g("id"), nombre: g("n") })); }}>
            <input name="id" required placeholder="clave (ej. roma)" pattern="[a-z0-9\-]+" className={input} />
            <input name="n" required placeholder="Nombre" className={`${input} flex-1`} />
            <Button type="submit">Agregar local</Button>
          </form>}
        </TabsContent>

        <TabsContent value="puestos" className="pizarra p-3 space-y-2">
          {puestos.map((p) => <FilaPuesto key={p.id} p={p} staff={staff} guardar={guardar} />)}
          {staff && <form className="flex flex-wrap gap-2 border-t border-border pt-2" onSubmit={(e) => { const g = fd(e); guardar(supabase.from("puesto").insert({ id: g("id"), nombre: g("n"), habilidad_requerida: g("h") || null })); }}>
            <input name="id" required placeholder="clave" pattern="[a-z0-9\-]+" className={input} />
            <input name="n" required placeholder="Nombre" className={input} />
            <input name="h" placeholder="Habilidad requerida" className={`${input} flex-1`} />
            <Button type="submit">Agregar puesto</Button>
          </form>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Tarifa = { id: number; puesto_id: string; importe: number | string; vigente_desde: string };
const tarifasDe = (tarifas: Tarifa[], puestoId: string) => tarifas.filter((t) => t.puesto_id === puestoId);

function Campo({ label, name, v, step = "1", disabled }: { label: string; name: string; v: number; step?: string; disabled?: boolean }) {
  return <label className="grid gap-1 text-sm">{label}<input name={name} type="number" step={step} min="0" defaultValue={v} disabled={disabled} className={input} /></label>;
}

function Parametros() {
  const cat = useCatalogo();
  const ses = useSesion();
  const guardar = useGuardar();
  const [ed, setEd] = useState(false);
  const parametros = cat.data?.parametros;
  if (!parametros) return null;
  const staff = !!ses.data?.staff;
  return (
    <form className="grid max-w-md gap-3" onSubmit={(e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const n = (k: string) => Number(f.get(k));
      guardar(supabase.from("parametros").update({ descanso_min_h: n("d"), max_dias_seguidos: n("m"), tope_semanal_default: n("t"), mult_extra: n("x"), prima_dominical: n("p") }).eq("id", 1));
      setEd(false);
    }}>
      <Campo label="Descanso mínimo entre turnos (horas)" name="d" v={parametros.descanso_min_h} disabled={!ed} />
      <Campo label="Máximo de días seguidos" name="m" v={parametros.max_dias_seguidos} disabled={!ed} />
      <Campo label="Tope semanal de horas (por defecto)" name="t" v={parametros.tope_semanal_default} disabled={!ed} />
      <Campo label="Multiplicador hora extra" name="x" v={parametros.mult_extra} step="0.05" disabled={!ed} />
      <Campo label="Prima dominical (0.25 = 25%)" name="p" v={parametros.prima_dominical} step="0.01" disabled={!ed} />
      {staff && (ed ? (
        <div className="flex gap-2">
          <Button type="submit" className="w-fit">Guardar</Button>
          <Button type="button" variant="ghost" className="w-fit" onClick={() => setEd(false)}>Cancelar</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-fit" onClick={() => setEd(true)}>Editar</Button>
      ))}
    </form>
  );
}

function FilaLocal({ l, staff, guardar }: { l: Local; staff: boolean; guardar: ReturnType<typeof useGuardar> }) {
  const [ed, setEd] = useState(false);
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("n")); guardar(supabase.from("local").update({ nombre: n }).eq("id", l.id)); setEd(false); }}>
      <input name="n" defaultValue={l.nombre} disabled={!ed} className={`${input} flex-1`} aria-label="Nombre del local" />
      {staff && (ed ? <>
        <Button type="submit" variant="outline">Guardar</Button>
        <Button type="button" variant="ghost" onClick={() => setEd(false)}>Cancelar</Button>
        <Button type="button" variant="ghost" onClick={() => confirm(`¿Borrar ${l.nombre} y sus franjas?`) && guardar(supabase.from("local").delete().eq("id", l.id), "Borrado")}>Borrar</Button>
      </> : (
        <Button type="button" variant="outline" onClick={() => setEd(true)}>Editar</Button>
      ))}
    </form>
  );
}

function FilaPuesto({ p, staff, guardar }: { p: { id: string; nombre: string; habilidad_requerida: string | null }; staff: boolean; guardar: ReturnType<typeof useGuardar> }) {
  const [ed, setEd] = useState(false);
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); guardar(supabase.from("puesto").update({ nombre: String(f.get("n")), habilidad_requerida: String(f.get("h")) || null }).eq("id", p.id)); setEd(false); }}>
      <input name="n" defaultValue={p.nombre} disabled={!ed} className={input} aria-label="Nombre" />
      <input name="h" defaultValue={p.habilidad_requerida ?? ""} disabled={!ed} placeholder="Habilidad requerida" className={`${input} flex-1`} aria-label="Habilidad requerida" />
      {staff && (ed ? <>
        <Button type="submit" variant="outline">Guardar</Button>
        <Button type="button" variant="ghost" onClick={() => setEd(false)}>Cancelar</Button>
        <Button type="button" variant="ghost" onClick={() => confirm(`¿Borrar ${p.nombre}?`) && guardar(supabase.from("puesto").delete().eq("id", p.id), "Borrado")}>Borrar</Button>
      </> : (
        <Button type="button" variant="outline" onClick={() => setEd(true)}>Editar</Button>
      ))}
    </form>
  );
}

function Franjas() {
  const cat = useCatalogo();
  const ses = useSesion();
  const guardar = useGuardar();
  const [sel, setSel] = useState<string>();
  const semanaId = sel ?? semanaPorDefecto(cat.data?.semanas ?? []);
  const sem = useSemana(semanaId);
  if (!cat.data || !sem.data) return null;
  const { locales, puestos } = cat.data;
  const staff = !!ses.data?.staff;
  const cerrada = sem.data.semana.estado === "cerrada";
  const puedeAgregar = staff && !cerrada;
  return (
    <div className="pizarra space-y-3 p-3">
      <SelectorSemana semanas={cat.data.semanas} valor={semanaId} onCambio={setSel} />
      {cerrada && <p className="text-sm text-muted-foreground">Semana cerrada: solo lectura.</p>}
      {puedeAgregar && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => {
          const g = fd(e);
          guardar(supabase.from("franja").insert({ semana_id: semanaId!, local_id: g("l"), puesto_id: g("p"), dia: Number(g("d")), inicio: g("i"), fin: g("f"), cobertura_minima: Number(g("c")), cupo_maximo: Number(g("x")), etiqueta: g("e") || null, habilidad_requerida: g("h") || null }), "Franja creada");
        }}>
          <select name="l" className={input}>{locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select>
          <select name="p" className={input}>{puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
          <select name="d" className={input}>{DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
          <input name="i" type="time" required className={input} aria-label="Inicio" />
          <input name="f" type="time" required className={input} aria-label="Fin" />
          <input name="c" type="number" min="0" defaultValue={1} className={`${input} w-20`} aria-label="Cobertura mínima" title="Cobertura mínima" />
          <input name="x" type="number" min="1" defaultValue={2} className={`${input} w-20`} aria-label="Cupo máximo" title="Cupo máximo" />
          <input name="e" placeholder="Etiqueta (opcional)" className={input} />
          <input name="h" placeholder="Habilidad requerida (opcional)" className={input} />
          <Button type="submit">Agregar franja</Button>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Día</th><th>Local</th><th>Puesto</th><th>Horario</th><th>Mín.</th><th>Cupo</th><th>Requisito</th><th /></tr></thead>
          <tbody>
            {sem.data.franjas.map((f) => (
              <FilaFranja key={f.id} f={f} locales={locales} puestos={puestos} staff={staff && !cerrada} guardar={guardar} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Franja = { id: string; dia: number; local_id: string; puesto_id: string; inicio: string; fin: string; cobertura_minima: number; cupo_maximo: number; etiqueta: string | null; habilidad_requerida: string | null };

function FilaFranja({ f, locales, puestos, staff, guardar }: {
  f: Franja; locales: Local[]; puestos: { id: string; nombre: string }[]; staff: boolean; guardar: ReturnType<typeof useGuardar>;
}) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(() => ({
    dia: f.dia, local_id: f.local_id, puesto_id: f.puesto_id,
    inicio: hhmm(f.inicio), fin: hhmm(f.fin),
    cobertura_minima: f.cobertura_minima, cupo_maximo: f.cupo_maximo,
    etiqueta: f.etiqueta ?? "", habilidad_requerida: f.habilidad_requerida ?? "",
  }));
  const set = (k: keyof typeof v, val: string | number) => setV((prev) => ({ ...prev, [k]: val }));
  const cancelar = () => {
    setV({ dia: f.dia, local_id: f.local_id, puesto_id: f.puesto_id, inicio: hhmm(f.inicio), fin: hhmm(f.fin), cobertura_minima: f.cobertura_minima, cupo_maximo: f.cupo_maximo, etiqueta: f.etiqueta ?? "", habilidad_requerida: f.habilidad_requerida ?? "" });
    setEd(false);
  };
  const guardarFila = () => {
    if (Number(v.cobertura_minima) > Number(v.cupo_maximo)) {
      toast.error("La cobertura mínima no puede ser mayor que el cupo máximo.");
      return;
    }
    guardar(supabase.from("franja").update({
      dia: Number(v.dia), local_id: v.local_id, puesto_id: v.puesto_id,
      inicio: v.inicio, fin: v.fin,
      cobertura_minima: Number(v.cobertura_minima), cupo_maximo: Number(v.cupo_maximo),
      etiqueta: v.etiqueta || null, habilidad_requerida: v.habilidad_requerida || null,
    }).eq("id", f.id));
    setEd(false);
  };
  if (!ed) {
    return (
      <tr className="border-t border-border">
        <td className="py-1">{DIAS[f.dia]}</td>
        <td>{locales.find((l) => l.id === f.local_id)?.nombre}</td>
        <td>{f.etiqueta ?? puestos.find((p) => p.id === f.puesto_id)?.nombre}</td>
        <td>{hhmm(f.inicio)}–{hhmm(f.fin)}</td>
        <td>{f.cobertura_minima}</td>
        <td>{f.cupo_maximo}</td>
        <td className="text-xs">{f.habilidad_requerida ?? "—"}</td>
        <td className="whitespace-nowrap">
          {staff && <button type="button" className="text-xs underline" onClick={() => setEd(true)}>Editar</button>}
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-border bg-muted/40">
      <td className="py-1">
        <select value={v.dia} onChange={(e) => set("dia", Number(e.target.value))} className={input} aria-label="Día">
          {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </td>
      <td>
        <select value={v.local_id} onChange={(e) => set("local_id", e.target.value)} className={input} aria-label="Local">
          {locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
      </td>
      <td>
        <select value={v.puesto_id} onChange={(e) => set("puesto_id", e.target.value)} className={input} aria-label="Puesto">
          {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input value={v.etiqueta} onChange={(e) => set("etiqueta", e.target.value)} placeholder="Etiqueta (opcional)" className={`${input} mt-1 w-full`} aria-label="Etiqueta" />
      </td>
      <td className="whitespace-nowrap">
        <input type="time" value={v.inicio} onChange={(e) => set("inicio", e.target.value)} className={`${input} w-24`} aria-label="Inicio" />
        {"–"}
        <input type="time" value={v.fin} onChange={(e) => set("fin", e.target.value)} className={`${input} w-24`} aria-label="Fin" />
      </td>
      <td><input type="number" min="0" value={v.cobertura_minima} onChange={(e) => set("cobertura_minima", e.target.value)} className={`${input} w-16`} aria-label="Cobertura mínima" /></td>
      <td><input type="number" min="1" value={v.cupo_maximo} onChange={(e) => set("cupo_maximo", e.target.value)} className={`${input} w-16`} aria-label="Cupo máximo" /></td>
      <td><input value={v.habilidad_requerida} onChange={(e) => set("habilidad_requerida", e.target.value)} placeholder="—" className={`${input} w-28`} aria-label="Requisito" /></td>
      <td className="whitespace-nowrap">
        <button type="button" className="text-xs underline" onClick={guardarFila}>Guardar</button>
        {" "}<button type="button" className="text-xs underline" onClick={cancelar}>Cancelar</button>
        {" "}<button type="button" className="text-xs text-peligro underline" onClick={() => confirm("¿Borrar franja?") && guardar(supabase.from("franja").delete().eq("id", f.id), "Borrada")}>Borrar</button>
      </td>
    </tr>
  );
}

const lista = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
const colorLocal = (id: string) => id === "tienda" ? "bg-tienda" : id === "winebar" ? "bg-winebar" : "bg-muted-foreground";

type Local = { id: string; nombre: string };

const datos = (f: FormData, locales: Local[]) => ({
  alias: String(f.get("alias") ?? "").trim(),
  email: String(f.get("email") ?? "").trim(),
  locales: locales.filter((l) => f.get(`l_${l.id}`)).map((l) => l.id),
  habilidades: lista(String(f.get("hab") ?? "")),
  tope_semanal: Number(f.get("tope")),
});

const Locales = ({ locales, sel, editable }: { locales: Local[]; sel: string[]; editable: boolean }) => (
  <div className="flex gap-2">{locales.map((l) => (
    <label key={l.id} className="flex items-center gap-1 text-xs">
      <input type="checkbox" name={`l_${l.id}`} defaultChecked={sel.includes(l.id)} disabled={!editable} />
      <span className={`inline-block h-2 w-2 rounded-full ${colorLocal(l.id)}`} />{l.nombre}
    </label>
  ))}</div>
);

function FilaPersonal({ p, admin, locales, guardar }: {
  p: Persona; admin: boolean; locales: Local[]; guardar: ReturnType<typeof useGuardar>;
}) {
  const [ed, setEd] = useState(false);
  const [hab, setHab] = useState(p.habilidades.join(", "));
  const cancelar = () => { setHab(p.habilidades.join(", ")); setEd(false); };
  return (
    <form className="flex flex-wrap items-center gap-2 border-b border-border pb-2" onSubmit={(e) => { e.preventDefault(); guardar(supabase.from("persona").update(datos(new FormData(e.currentTarget), locales)).eq("id", p.id)); setEd(false); }}>
      <input name="alias" defaultValue={p.alias} disabled={!ed} className={`${input} w-32`} aria-label="Alias" />
      <span className="flex w-9 shrink-0 justify-center"><HabilidadesIconos habilidades={lista(hab)} /></span>
      <input name="email" type="email" defaultValue={p.email} disabled={!ed} className={`${input} w-52`} aria-label="Email" />
      <Locales locales={locales} sel={p.locales} editable={ed} />
      <input name="hab" value={hab} onChange={(e) => setHab(e.target.value)} disabled={!ed} placeholder="Habilidades (separadas por comas)" className={`${input} flex-1 min-w-48`} aria-label="Habilidades" />
      <input name="tope" type="number" min="0" defaultValue={p.tope_semanal} disabled={!ed} className={`${input} w-20`} aria-label="Tope semanal" title="Tope semanal (h)" />
      {admin && (ed ? <>
        <Button type="submit" variant="outline">Guardar</Button>
        <Button type="button" variant="ghost" onClick={cancelar}>Cancelar</Button>
        <Button type="button" variant="ghost" onClick={() => confirm(`¿Borrar a ${p.alias}?`) && guardar(supabase.from("persona").delete().eq("id", p.id), "Borrado")}>Borrar</Button>
      </> : (
        <Button type="button" variant="outline" onClick={() => setEd(true)}>Editar</Button>
      ))}
    </form>
  );
}

function Personal() {
  const cat = useCatalogo();
  const ses = useSesion();
  const guardar = useGuardar();
  const refrescar = useRefrescar();
  const [nuevaHab, setNuevaHab] = useState("");
  if (!cat.data) return null;
  const { personas, locales, parametros } = cat.data;
  const admin = ses.data?.rol === "admin";
  return (
    <div className="pizarra space-y-2 p-3">
      {!admin && <p className="text-sm text-muted-foreground">Solo administración puede editar al personal.</p>}
      {personas.filter((p) => p.email).map((p) => (
        <FilaPersonal key={p.id} p={p} admin={admin} locales={locales} guardar={guardar} />
      ))}
      {admin && (
        <form className="flex flex-wrap items-center gap-2 pt-2" onSubmit={async (e) => {
          e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const id = String(f.get("id")).trim(); const d = datos(f, locales);
          if (!d.locales.length) { toast.error("Marca al menos un local para poder asignarle turnos."); return; }
          const { error } = await supabase.from("persona").insert({ id, ...d });
          if (error) { toast.error(error.code === "23505" ? "Ya existe una persona con esa clave." : error.message); return; }
          form.reset(); setNuevaHab(""); toast.success(`${d.alias} agregada al equipo y al planificador`); refrescar();
        }}>
          <input name="id" required placeholder="clave (ej. ana)" pattern="[a-z0-9\-]+" className={`${input} w-28`} />
          <input name="alias" required placeholder="Alias" className={`${input} w-32`} />
          <input name="email" type="email" required placeholder="Email" className={`${input} w-52`} />
          <Locales locales={locales} sel={[]} editable />
          <input name="hab" value={nuevaHab} onChange={(e) => setNuevaHab(e.target.value)} placeholder="Habilidades (separadas por comas)" className={`${input} flex-1 min-w-48`} />
          <span className="flex w-9 shrink-0 justify-center"><HabilidadesIconos habilidades={lista(nuevaHab)} /></span>
          <input name="tope" type="number" min="0" defaultValue={parametros?.tope_semanal_default ?? 40} className={`${input} w-20`} title="Tope semanal (h)" />
          <Button type="submit">Agregar persona</Button>
        </form>
      )}
    </div>
  );
}
