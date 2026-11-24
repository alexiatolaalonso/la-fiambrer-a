export const DEMO_PASSWORD = "fiambreria-demo-2026";

export type CuentaDemo = { email: string; nombre: string; rol: "admin" | "encargado" | "equipo"; detalle: string };

const equipo: [string, string, string][] = [
  ["mari", "Mari", "Tienda · Sala"],
  ["tono", "Toño", "Ambos locales · Sala, Barra"],
  ["lupe", "Lupe", "Tienda · Sala"],
  ["rocio", "Rocío", "Ambos locales · Sala, Barra"],
  ["beto", "Beto", "Tienda · no disponible miércoles"],
  ["paco", "Paco", "Tienda · Sala"],
  ["ines", "Inés", "Wine Bar · Catas"],
  ["sofia", "Sofía", "Ambos locales · Catas"],
  ["julian", "Julián", "Wine Bar · Cocina"],
  ["meche", "Meche", "Wine Bar · Cocina"],
  ["dani", "Dani", "Wine Bar · Barra, Sala"],
  ["caro", "Caro", "Wine Bar · Sala, vino"],
  ["nico", "Nico", "Ambos locales · Barra, Sala"],
  ["vale", "Vale", "Ambos locales · no disponible domingo"],
];

export const CUENTAS_DEMO: CuentaDemo[] = [
  { email: "admin.fiambreria@example.com", nombre: "Administración", rol: "admin", detalle: "Configuración, costos, solicitudes" },
  { email: "encargado.fiambreria@example.com", nombre: "Encargado de turno", rol: "encargado", detalle: "Planificador y solicitudes" },
  ...equipo.map(([id, nombre, detalle]) => ({ email: `${id}.fiambreria@example.com`, nombre, rol: "equipo" as const, detalle })),
];
