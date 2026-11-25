# Pedir ausencia: calendario y franja del día

## Qué cambia para el equipo
- En «Pedir ausencia» el desplegable de día se sustituye por un **calendario**. Solo se pueden elegir días de la semana abierta (el resto aparece en gris).
- Nuevo selector **Mañana / Tarde / Día completo** (por defecto, Día completo).
- En «Mis ausencias» y en Solicitudes se verá la fecha real y la franja, p. ej. «Jue 26 nov · Tarde».
- Al aprobar una ausencia solo se liberan los turnos de esa franja:
  - **Mañana**: turnos que empiezan antes de las 15:00.
  - **Tarde**: turnos que empiezan a las 15:00 o después.
  - **Día completo**: todos los turnos del día (como ahora).
- El planificador tampoco dejará asignar a esa persona en la franja ausente; el resto del día sigue disponible.

## Detalles técnicos
- Migración: `ausencia.franja text not null default 'completo' check (franja in ('manana','tarde','completo'))` (las existentes quedan como día completo).
- `ejecutar_comando`:
  - `pedir_ausencia` acepta `franja` y valida el valor.
  - `resolver_ausencia` filtra `turno`/`franja` por `inicio < '15:00'` (mañana) o `>= '15:00'` (tarde).
- Función de validación de asignación: la comprobación de ausencia aprobada tiene en cuenta la franja con el mismo corte.
- `mis-turnos.tsx`: diálogo con `Calendar` (shadcn, `mode="single"`, `locale es`, `disabled` fuera de la semana abierta); el día se envía como índice 0–6 calculado desde la fecha. Selector de franja con `ToggleGroup`.
- `solicitudes.tsx`: mostrar fecha y franja.
- Test en `reglas.test.ts` para el corte de las 15:00 (helper compartido `franjaDeHora`).
