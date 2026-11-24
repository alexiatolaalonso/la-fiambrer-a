import type { Semana } from "@/lib/datos";
import { addDias } from "@/lib/reglas";

export function etiquetaSemana(id: string) {
  const fmt = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${fmt(id)} – ${fmt(addDias(id, 6))}`;
}

export function SelectorSemana({ semanas, valor, onCambio }: { semanas: Semana[]; valor: string | undefined; onCambio: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Semana</span>
      <select
        className="h-9 rounded-md border border-input bg-card px-2"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      >
        {semanas.map((s) => (
          <option key={s.id} value={s.id}>
            {etiquetaSemana(s.id)} · {s.estado}
          </option>
        ))}
      </select>
    </label>
  );
}
