# Publicar la semana antes de que el equipo vea sus turnos

## Qué cambia
- En el Planificador (encargado y administración), arriba junto a «Cerrar semana», aparece un botón **«Publicar»**.
- Mientras la semana no esté publicada, se muestra la etiqueta «Borrador · el equipo aún no ve estos turnos».
- Al publicar: confirmación, y la etiqueta pasa a «Publicada». El equipo ya ve sus turnos en «Mis turnos».
- Si se cambian turnos después de publicar, los cambios se ven al momento (no hace falta volver a publicar).
- En «Mis turnos», si la semana no está publicada, el equipo ve: «Tus turnos de esta semana aún no están publicados».
- Cerrar una semana la publica automáticamente si no lo estaba.
- Las semanas actuales ya existentes se marcan como publicadas para no ocultarle nada al equipo; las nuevas («Nueva semana») empiezan en borrador.

## Detalles técnicos
- Migración: `semana.publicada_en timestamptz null`; rellenar `now()` en semanas existentes.
- `ejecutar_comando`: nuevo tipo staff `publicar_semana` (revisión, idempotencia, bloqueo como el resto); `cerrar_semana` pone `publicada_en` si es null.
- RLS `turno` SELECT: `es_staff() OR (persona_id = persona_actual() AND EXISTS franja→semana con publicada_en not null)`. Igual en `ausencia`/`intercambio` no cambia.
- RPCs de intercambio (`turnos_intercambiables*`) filtran semanas no publicadas.
- UI: `planificador.tsx` botón + etiqueta; `mis-turnos.tsx` aviso de no publicada.
- Test en `reglas.test.ts` no aplica (regla en SQL); verificación con Playwright como Mari antes y después de publicar.
