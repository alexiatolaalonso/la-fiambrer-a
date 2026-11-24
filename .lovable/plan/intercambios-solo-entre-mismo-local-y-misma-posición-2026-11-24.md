# Intercambios solo entre mismo local y misma posición

## Qué cambia para el equipo
- Al proponer un intercambio, primero se elige **tu turno**. La lista de compañeros muestra solo a quienes trabajan en el local de ese turno (o en **Ambos**).
- Si se pide un turno a cambio, solo aparecen turnos del compañero en **el mismo local y la misma posición** (p. ej. Wine Bar · Sumiller ↔ Wine Bar · Sumiller).
- Un aviso breve explica la regla cuando no hay compañeros o turnos compatibles.
- Si alguien intenta saltarse la regla, la solicitud se rechaza con un mensaje claro («Solo puedes intercambiar con alguien del mismo local y posición»). Encargados también verán esa validación al aprobar.

## Detalles técnicos
- Nueva migración que reemplaza `ejecutar_comando` (rama `proponer_intercambio` y `resolver_intercambio`): exigir que `persona_b.locales` contenga el `local_id` de la franja de `turno_a`; si hay `turno_b`, su franja debe tener el mismo `local_id` y `puesto_id`.
- `turnos_intercambiables` acepta un `_turno_ref uuid` opcional para filtrar por local y puesto del turno de referencia.
- `mis-turnos.tsx` (diálogo Intercambio): reordenar a turno propio → compañero filtrado por `locales` → turno compatible; resetear selecciones al cambiar el turno.
- Prueba en el navegador como Mari: verificar listas filtradas y rechazo de un intercambio inválido vía comando.
