# La Fiambrería — Planificador de turnos semanales

App para dos locales en la Condesa (Tienda Condesa, Wine Bar Condesa) con tres roles: administración, encargado y equipo.

## Pantallas
1. **Entrar (demo)**: elegir rol y persona; sesión real con cuentas de ejemplo para que los permisos se apliquen de verdad.
2. **Configuración (admin)**: locales, puestos, franjas con cobertura mínima, tarifas versionadas con historial, parámetros (descanso 11h, máx. 6 días seguidos, tope semanal, multiplicador extra, prima dominical).
3. **Planificador semanal (encargado)**: grilla día × franja, arrastrar personas (también con teclado). Rechazos con motivo visible: «No disponible», «Descanso <11h (incluye el otro local)», «7 días seguidos — falta descanso», «Cata jueves requiere habilidad Catas y servicio de vino». Rojo ladrillo bajo cobertura, verde botella completa. «Cerrar semana» deja todo en solo lectura.
4. **Panel de costos (admin)**: horas por persona, costo con prima dominical, horas extra, franjas flojas, «Exportar CSV» que cuadra con los totales; sin 0% engañosos cuando no hay datos.
5. **Mis turnos (equipo)**: turnos propios, pedir ausencia, proponer intercambio, descargar .ics, copiar texto, compartir.
6. **Solicitudes (encargado/admin)**: aprobar/rechazar ausencias (liberan franjas) e intercambios (solo si ambos siguen cumpliendo reglas). Todo o nada.
7. **Reiniciar datos** y README completo.

## Datos de ejemplo
14 personas sintéticas, 4 puestos, franjas de una semana incluyendo la cata del jueves, tarifa 100 → 120 para reproducir el caso de tarifa histórica.

## Diseño
Pizarra de barra pasada en limpio: crema #F6F1E7, tinto #5B1A2B, verde botella #2F4A3A, ámbar #C9A227, rojo ladrillo #B5462F. Cormorant Garamond en títulos, Source Sans 3 en texto. Usable en 360px.

## Detalles técnicos
- Lovable Cloud: tablas local, puesto, persona, franja, tarifa (vigente_desde), turno (tarifa_aplicada, costo_congelado), ausencia, intercambio, semana, comando, ajuste; user_roles separado con has_role.
- RLS: equipo solo lee sus turnos; encargado/admin según rol.
- Todas las escrituras pasan por una función SQL transaccional `ejecutar_comando(id, tipo, datos, revision)`: idempotencia (mismo id+datos = un efecto; datos distintos = rechazo), control de revisión optimista, bloqueo de filas para concurrencia, rollback total ante fallo, devuelve la condición fallida.
- Validaciones (disponibilidad, 11h entre locales, 7 días, habilidad de cata) en SQL y reflejadas en el cliente para feedback inmediato.
- Correcciones sobre semana cerrada crean un ajuste vinculado, sin reescribir.
- Cuentas demo sembradas en la migración; reinicio por función restringida.
- Tests de las reglas (descanso, 7 días, prima dominical, horas extra, tarifa histórica, CSV = panel).
