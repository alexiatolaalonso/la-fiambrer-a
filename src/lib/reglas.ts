export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
export const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export function addDias(iso: string, n: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function minutos(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Horas de una franja; si termina a la misma hora o antes, cruza medianoche. */
export function horasFranja(inicio: string, fin: string): number {
  const i = minutos(inicio);
  let f = minutos(fin);
  if (f <= i) f += 1440;
  return (f - i) / 60;
}

export const hhmm = (t: string) => t.slice(0, 5);

/** Días donde falta descanso: el día siguiente a cada racha de `max` días seguidos trabajados. */
export function diasDescansoFaltante(fechas: string[], max: number): string[] {
  const set = new Set(fechas);
  const orden = [...set].sort();
  const res: string[] = [];
  for (const f of orden) {
    if (set.has(addDias(f, -1))) continue; // no es inicio de racha
    let n = 1;
    let ult = f;
    while (set.has(addDias(ult, 1))) { ult = addDias(ult, 1); n++; }
    if (n >= max) res.push(addDias(ult, 1));
  }
  return res;
}

export type EstadoCobertura = "completa" | "floja" | "sin-requisito";
export function estadoCobertura(asignados: number, minimo: number): EstadoCobertura {
  if (minimo <= 0) return "sin-requisito";
  return asignados >= minimo ? "completa" : "floja";
}

/** Porcentaje legible; sin datos aplicables devuelve "—" en vez de 0%. */
export function porcentaje(num: number, den: number): string {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}
export function promedio(valores: number[]): string {
  if (!valores.length) return "—";
  return (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
}

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export type FilaCosto = {
  alias: string; fecha: string; local: string; puesto: string; inicio: string; fin: string;
  horas: number; horas_extra: number; tarifa: number; domingo: boolean; costo: number;
};
export type FilaAjuste = { alias: string; fecha: string; horas: number; importe: number; motivo: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV de costos; el total es la suma exacta de turnos + ajustes (concilia con el panel). */
export function construirCsv(filas: FilaCosto[], ajustes: FilaAjuste[]): { csv: string; total: number } {
  const lineas = [["tipo", "persona", "fecha", "local", "puesto", "inicio", "fin", "horas", "horas_extra", "tarifa", "domingo", "importe", "motivo"].join(",")];
  let total = 0;
  for (const f of filas) {
    total += f.costo;
    lineas.push(["turno", f.alias, f.fecha, f.local, f.puesto, hhmm(f.inicio), hhmm(f.fin), f.horas, f.horas_extra, f.tarifa, f.domingo ? "sí" : "no", f.costo.toFixed(2), ""].map(esc).join(","));
  }
  for (const a of ajustes) {
    total += a.importe;
    lineas.push(["ajuste", a.alias, a.fecha, "", "", "", "", a.horas, "", "", "", a.importe.toFixed(2), a.motivo].map(esc).join(","));
  }
  total = r2(total);
  lineas.push(["TOTAL", "", "", "", "", "", "", "", "", "", "", total.toFixed(2), ""].join(","));
  return { csv: lineas.join("\n"), total };
}

export type EventoTurno = { id: string; fecha: string; inicio: string; fin: string; titulo: string; lugar: string };

const icsFecha = (fecha: string, hora: string) => `${fecha.replace(/-/g, "")}T${hhmm(hora).replace(":", "")}00`;

export function construirIcs(eventos: EventoTurno[]): string {
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//La Fiambreria//Turnos//ES", "CALSCALE:GREGORIAN"];
  for (const e of eventos) {
    const finFecha = minutos(hhmm(e.fin)) <= minutos(hhmm(e.inicio)) ? addDias(e.fecha, 1) : e.fecha;
    out.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@lafiambreria`,
      `DTSTAMP:${icsFecha(e.fecha, e.inicio)}`,
      `DTSTART;TZID=America/Mexico_City:${icsFecha(e.fecha, e.inicio)}`,
      `DTEND;TZID=America/Mexico_City:${icsFecha(finFecha, e.fin)}`,
      `SUMMARY:${e.titulo}`,
      `LOCATION:${e.lugar}`,
      "END:VEVENT",
    );
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

export function textoTurnos(alias: string, eventos: EventoTurno[]): string {
  if (!eventos.length) return `${alias}: sin turnos esta semana.`;
  return [`Turnos de ${alias} — La Fiambrería`, ...eventos.map((e) => `• ${e.fecha} ${hhmm(e.inicio)}–${hhmm(e.fin)} ${e.titulo} (${e.lugar})`)].join("\n");
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
