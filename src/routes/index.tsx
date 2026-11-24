import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CUENTAS_DEMO, DEMO_PASSWORD, type CuentaDemo } from "@/lib/demo";
import { prepararCuentaDemo } from "@/lib/demo.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — La Fiambrería Turnos" },
      { name: "description", content: "Entra como administración, encargado o equipo para planificar los turnos de La Fiambrería." },
      { property: "og:title", content: "La Fiambrería — Planificador de turnos" },
      { property: "og:description", content: "Turnos semanales para Tienda Condesa y Wine Bar Condesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

const destino = { admin: "/costos", encargado: "/planificador", equipo: "/mis-turnos" } as const;

function Entrar() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<string | null>(null);

  async function entrar(c: CuentaDemo) {
    setCargando(c.email);
    try {
      await supabase.auth.signOut();
      let r = await supabase.auth.signInWithPassword({ email: c.email, password: DEMO_PASSWORD });
      if (r.error) {
        await prepararCuentaDemo({ data: { email: c.email } });
        r = await supabase.auth.signInWithPassword({ email: c.email, password: DEMO_PASSWORD });
      }
      if (r.error) throw r.error;
      navigate({ to: destino[c.rol] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo entrar");
    } finally {
      setCargando(null);
    }
  }

  const grupo = (rol: CuentaDemo["rol"]) => CUENTAS_DEMO.filter((c) => c.rol === rol);
  const Tarjeta = ({ c }: { c: CuentaDemo }) => (
    <button
      onClick={() => entrar(c)}
      disabled={!!cargando}
      className="pizarra flex flex-col items-start p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
    >
      <span className="font-semibold text-primary">{cargando === c.email ? "Entrando…" : c.nombre}</span>
      <span className="text-xs text-muted-foreground">{c.detalle}</span>
    </button>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Condesa · CDMX</p>
      <h1 className="text-5xl text-primary">La Fiambrería</h1>
      <p className="mt-1 text-lg text-muted-foreground">Pizarra de turnos · Tienda Condesa y Wine Bar Condesa</p>

      <section className="mt-8">
        <h2 className="text-2xl">Entrar como…</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[...grupo("admin"), ...grupo("encargado")].map((c) => <Tarjeta key={c.email} c={c} />)}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl">Persona del equipo</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {grupo("equipo").map((c) => <Tarjeta key={c.email} c={c} />)}
        </div>
      </section>
      <p className="mt-8 text-xs text-muted-foreground">Modo demo: cada botón entra con una cuenta de prueba real; los permisos se aplican en la base de datos.</p>
    </main>
  );
}
