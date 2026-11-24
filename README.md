# La Fiambrería — Planificador de turnos semanales

Planificador para dos locales en la Condesa (Tienda Condesa y Wine Bar Condesa), con tres roles: administración, encargado de turno y equipo.

## Entrar
En la pantalla inicial, elige una cuenta de prueba: Administración, Encargado de turno o cualquiera de las 14 personas del equipo. Cada botón entra con una cuenta real (contraseña demo `fiambreria-demo-2026`), así que los permisos se aplican en la base de datos.

| Rol | Pantallas |
|---|---|
| Administración | Planificador, Costos, Solicitudes, Configuración (y botón «Reiniciar datos») |
| Encargado | Planificador, Solicitudes |
| Equipo | Mis turnos (solo ve sus propios turnos) |

## Caso del briefing (datos de ejemplo, semana 23–29 nov 2026)
Entra como **Encargado** → Planificador:
1. **Rocío → Lun 10:00 Tienda**: rechazado «Descanso <11h (incluye el otro local)» (cerró Barra del Wine Bar el domingo a la 01:00).
2. **Beto → Mié 16:00 Tienda**: «No disponible».
3. **Paco → Dom 10:00 Tienda**: «7 días seguidos — falta descanso» (su tira de días marca el domingo en rojo).
4. **Toño → Cata jueves**: «Cata jueves requiere habilidad Catas y servicio de vino». Inés o Sofía sí entran.
5. Las franjas bajo cobertura mínima se ven en rojo ladrillo; las completas, en verde botella.

Entra como **Administración** → Costos:
- La semana del 16–22 nov está cerrada con Sala a **$100/h**; la actual usa **$120/h** (nueva versión vigente desde el 23 nov). Los turnos cerrados mantienen su tarifa.
- Dani pasa su tope de 40 h el domingo: esa hora va con multiplicador de horas extra y prima dominical.
- «Exportar CSV»: la fila TOTAL coincide con el total del panel.
- En una semana cerrada, «Corregir» crea un ajuste vinculado; no reescribe el turno.

Entra como persona del equipo → Mis turnos: pedir ausencia, proponer intercambio, descargar .ics, copiar texto y compartir.

## Reglas garantizadas en el servidor
Todas las asignaciones y solicitudes pasan por la función `ejecutar_comando(id, tipo, datos)`:
- **Idempotencia**: el mismo id con los mismos datos aplica un solo efecto; el mismo id con datos distintos se rechaza sin escribir nada.
- **Revisión**: cada semana tiene una revisión; si está desactualizada, no cambia nada y se muestra la condición que falló.
- **Concurrencia**: bloquea la semana, la franja y la persona; el cupo máximo de una franja no se consume dos veces.
- **Todo o nada**: cualquier error revierte la operación completa (aprobar una ausencia, un intercambio, etc.).
- **Semana cerrada**: solo lectura; los costos quedan congelados.
- **Permisos (RLS)**: una cuenta de equipo solo puede leer sus turnos, ausencias e intercambios. Para verificarlo con una consulta directa: `select count(*) from turno` con la sesión de Mari devuelve solo los suyos.

## Reiniciar
Configuración → «Reiniciar datos» restaura el escenario de ejemplo. Los datos persisten al recargar.

## Pruebas
`bunx vitest run`: reglas de descanso faltante, horas que cruzan medianoche, cobertura, indicadores sin datos, conciliación del CSV y .ics.
