import { describe, expect, it } from "vitest";
import { construirCsv, construirIcs, diasDescansoFaltante, estadoCobertura, horasFranja, porcentaje, promedio } from "./reglas";

describe("reglas de turnos", () => {
  it("una franja 18:00–01:00 dura 7 horas (cruza medianoche)", () => {
    expect(horasFranja("18:00", "01:00")).toBe(7);
  });
  it("6 días seguidos marcan el séptimo como descanso faltante", () => {
    const f = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28"];
    expect(diasDescansoFaltante(f, 6)).toEqual(["2026-11-29"]);
    expect(diasDescansoFaltante(f.slice(0, 5), 6)).toEqual([]);
  });
  it("franja bajo cobertura mínima queda floja", () => {
    expect(estadoCobertura(1, 2)).toBe("floja");
    expect(estadoCobertura(2, 2)).toBe("completa");
  });
  it("sin datos aplicables no muestra 0% ni promedio 0", () => {
    expect(porcentaje(0, 0)).toBe("—");
    expect(promedio([])).toBe("—");
  });
  it("el total del CSV concilia con turnos + ajustes", () => {
    const base = { alias: "Mari", fecha: "2026-11-29", local: "Tienda", puesto: "Sala", inicio: "10:00", fin: "16:00", horas: 6, horas_extra: 0, tarifa: 120, domingo: true };
    const { total, csv } = construirCsv([{ ...base, costo: 900 }, { ...base, costo: 720.5 }], [{ alias: "Mari", fecha: "2026-11-29", horas: -1, importe: -150, motivo: "Salió antes" }]);
    expect(total).toBe(1470.5);
    expect(csv.trim().split("\n").at(-1)).toContain("1470.50");
  });
  it("el .ics termina al día siguiente si el turno cruza medianoche", () => {
    const ics = construirIcs([{ id: "x", fecha: "2026-11-29", inicio: "18:00", fin: "01:00", titulo: "Barra", lugar: "Wine Bar" }]);
    expect(ics).toContain("DTEND;TZID=America/Mexico_City:20261130T010000");
  });
});

import { ausenciaCubre, franjaDeHora } from "./reglas";
describe("franja de ausencia", () => {
  it("un turno de las 15:59 es de mañana", () => expect(franjaDeHora("15:59:00")).toBe("manana"));
  it("un turno de las 16:00 es de tarde", () => expect(franjaDeHora("16:00:00")).toBe("tarde"));
  it("ausencia de mañana no cubre un turno de las 18:00", () => expect(ausenciaCubre("manana", "18:00")).toBe(false));
  it("día completo cubre cualquier turno", () => expect(ausenciaCubre("completo", "09:00")).toBe(true));
});
