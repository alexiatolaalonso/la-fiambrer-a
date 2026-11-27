import { ChefHat, Grape, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const min = (h: string) => h.trim().toLowerCase();

/** Cocina: la habilidad se llama «Cocina». */
export const esCocina = (hs: string[]) => hs.some((h) => min(h) === "cocina" || min(h) === "cocinero");

/** Sumiller: sirve vino, cata o es sommelier. */
export const esSumiller = (hs: string[]) =>
  hs.some((h) => {
    const t = min(h);
    return t.includes("vino") || t.includes("sumiller") || t === "sommelier";
  });

/** Encargado: la habilidad se llama «Encargado/a». */
export const esEncargado = (hs: string[]) => hs.some((h) => min(h).startsWith("encargad"));

/**
 * Gorro de chef para cocina y uvas para sumiller.
 * `iconClass` permite cambiar el color cuando el fondo lo exige.
 */
export function HabilidadesIconos({
  habilidades,
  className,
  iconClass,
}: {
  habilidades: string[];
  className?: string;
  iconClass?: string;
}) {
  const cocina = esCocina(habilidades);
  const sumiller = esSumiller(habilidades);
  const encargado = esEncargado(habilidades);
  if (!cocina && !sumiller && !encargado) return null;
  const etiqueta = [encargado && "Encargado", cocina && "Cocina", sumiller && "Sumiller"].filter(Boolean).join(" · ");
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} title={etiqueta}>
      {encargado && <KeyRound aria-label="Encargado" className={cn("h-3.5 w-3.5 text-alerta", iconClass)} />}
      {cocina && <ChefHat aria-label="Cocina" className={cn("h-3.5 w-3.5 text-primary", iconClass)} />}
      {sumiller && <Grape aria-label="Sumiller" className={cn("h-3.5 w-3.5 text-winebar", iconClass)} />}
    </span>
  );
}
