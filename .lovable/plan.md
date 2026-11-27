# Comida, tope de turno, 48 h, horas extra al doble, «Refuerzo» y motivo de descanso

## Qué cambia para ti

1. **Comida de 30 min**: un turno de más de 6 h cuenta 30 min menos de trabajo pagado (ej. un turno de 6 h cuenta 6 h; uno de 7 h cuenta 6,5 h). Se ve en las horas de las fichas, en Costos y en el CSV.
2. **Tope de 9 h por turno**: no se podrá crear ni editar una franja que dure más de 9 h (aviso claro en Configuración → Franjas), y el planificador rechaza asignar a una franja así si ya existiera.
3. **Límite de 48 h semanales**: si la asignación deja a la persona por encima de 48 h trabajadas en la semana, se rechaza con el motivo «Supera 48 h semanales: llevaría X h».
4. **Horas extra al doble**: las horas por encima del tope semanal de la persona se pagan ×2. Hasta 9 h extra entran sin más. Si la asignación la lleva a más de 9 h extra, el planificador avisa en rojo y pide un motivo obligatorio antes de guardar; el motivo queda registrado.
5. **«Refuerzo»**: cuando una franja ya tiene su cobertura mínima, las personas asignadas por encima aparecen con la etiqueta «Refuerzo».
6. **Motivo de descanso detallado**: en vez de «Descanso <11h», el rechazo dirá por ejemplo «No entra: le quedan 10 h de descanso desde el cierre del sábado (Wine Bar, 00:30)».
7. **Parámetros**: en Configuración → Parámetros se añaden, editables: minutos de comida (30), a partir de cuántas horas (6), duración máxima de turno (9), máximo semanal (48), máximo de horas extra sin motivo (9). El multiplicador de horas extra pasa a 2. Se añade la leyenda «Valores de ejemplo; no reemplazan el asesoramiento laboral del negocio».

Las semanas cerradas mantienen sus costos congelados; el cambio solo afecta a semanas abiertas.

## Detalles técnicos

- Migración:
  - `parametros`: columnas `comida_min` (30), `comida_desde_h` (6), `max_horas_turno` (9), `max_horas_semana` (48), `max_extra_sin_motivo` (9); `update parametros set mult_extra = 2`.
  - Función `horas_pagadas(ts_inicio, ts_fin)` que resta la comida según parámetros; usada en `_costos_semana` (horas, horas_extra y costo) y en `validar_asignacion`.
  - `turno`: columna nullable `motivo_extra text`.
  - `validar_asignacion`: rechaza franjas > `max_horas_turno`, rechaza si horas de semana + nuevas > `max_horas_semana`, y reescribe el mensaje de descanso calculando las horas reales desde el fin del turno previo, su día y local.
  - `ejecutar_comando('asignar')`: si las horas extra resultantes > `max_extra_sin_motivo` y no viene `motivo_extra`, lanza un error con prefijo `REQUIERE_MOTIVO:` y el detalle; con motivo, lo guarda en el turno.
  - Trigger/check en `franja` que impide duración > `max_horas_turno` al insertar o editar.
- Frontend:
  - `reglas.ts`: `horasPagadas(inicio, fin, params)`; tests nuevos (7 h → 6,5 h; 6 h → 6 h; extra al doble; 48 h).
  - `planificador.tsx`: horas de fichas con comida descontada; ante `REQUIERE_MOTIVO` abre un diálogo en rojo con campo de motivo obligatorio y reintenta; etiqueta «Refuerzo» en los asignados por encima de `cobertura_minima` (orden de alta).
  - `configuracion.tsx`: nuevos parámetros, leyenda legal y validación de 9 h en Franjas.
  - `costos.tsx`/CSV: sin cambios de estructura; reflejan los nuevos cálculos y añaden el motivo de horas extra si existe.
