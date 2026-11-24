import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
  },
  component: Layout,
});

const ENLACES = [
  { to: "/planificador", label: "Planificador", roles: ["admin", "encargado"] },
  { to: "/costos", label: "Costos", roles: ["admin"] },
  { to: "/solicitudes", label: "Solicitudes", roles: ["admin", "encargado"] },
  { to: "/configuracion", label: "Configuración", roles: ["admin"] },
  { to: "/mis-turnos", label: "Mis turnos", roles: ["equipo"] },
] as const;

function Layout() {
  const { data: s } = useSesion();
  const navigate = useNavigate();
  const rol = s?.rol;
  const nombre = s?.persona?.alias ?? (rol === "admin" ? "Administración" : rol === "encargado" ? "Encargado" : "");
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="font-display text-2xl font-semibold">La Fiambrería</Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {ENLACES.filter((e) => rol && (e.roles as readonly string[]).includes(rol)).map((e) => (
              <Link key={e.to} to={e.to} className="rounded px-2 py-1 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15 font-semibold" }}>
                {e.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="opacity-80">{nombre}</span>
            <button
              className="rounded border border-primary-foreground/40 px-2 py-1 hover:bg-primary-foreground/10"
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            >Salir</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4"><Outlet /></main>
    </div>
  );
}
