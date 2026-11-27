import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CUENTAS_DEMO, DEMO_PASSWORD } from "@/lib/demo";
import { prepararCuentaDemo } from "@/lib/demo.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — La Fiambrería Turnos" },
      { name: "description", content: "Entra con tu correo y contraseña para ver y planificar los turnos de La Fiambrería." },
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    const correo = email.trim().toLowerCase();
    try {
      await supabase.auth.signOut();
      let r = await supabase.auth.signInWithPassword({ email: correo, password });
      // Las cuentas de prueba se crean la primera vez que alguien entra con ellas.
      if (r.error && password === DEMO_PASSWORD && CUENTAS_DEMO.some((c) => c.email === correo)) {
        await prepararCuentaDemo({ data: { email: correo } });
        r = await supabase.auth.signInWithPassword({ email: correo, password });
      }
      if (r.error) throw new Error("Correo o contraseña incorrectos");
      const { data: roles } = await supabase.from("user_roles").select("role");
      const lista = (roles ?? []).map((x) => x.role);
      const rol = lista.includes("admin") ? "admin" : lista.includes("encargado") ? "encargado" : "equipo";
      navigate({ to: destino[rol] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Condesa · CDMX</p>
      <h1 className="text-5xl text-primary">La Fiambrería</h1>
      <p className="mt-1 text-lg text-muted-foreground">Pizarra de turnos · Tienda Condesa y Wine Bar Condesa</p>

      <form onSubmit={entrar} className="pizarra mt-8 flex flex-col gap-4 p-5">
        <h2 className="text-2xl">Entrar</h2>
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2" />
        </label>
        <button type="submit" disabled={cargando}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
