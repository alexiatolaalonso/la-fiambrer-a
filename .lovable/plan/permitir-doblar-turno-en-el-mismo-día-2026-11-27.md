# Permitir doblar turno en el mismo día

## Qué cambia para ti
En Configuración → Parámetros aparece una fila nueva, editable con su botón «Editar» como las demás:

- **Doblar turno en el mismo día** — interruptor Sí / No. Por defecto **No** (igual que hoy).

Hoy el descanso mínimo de 11 h impide que una persona tenga dos turnos el mismo día. Con el interruptor en **Sí**:
- Se puede asignar a alguien a un segundo turno ese mismo día (por ejemplo, mañana en Tienda y noche en Wine Bar), siempre que los horarios **no se solapen**.
- El descanso mínimo de 11 h se sigue exigiendo entre un día y el siguiente.
- Las demás reglas no cambian (habilidades, no disponible, ausencias, máx. días seguidos, tope semanal y horas extra).

Con el interruptor en **No**, todo funciona exactamente como ahora. Solo administración puede cambiarlo; encargados lo ven en solo lectura.

## Detalles técnicos
- Migración: `parametros.permitir_doble_turno boolean not null default false`.
- `validar_asignacion`: si `permitir_doble_turno` es true, los turnos con la misma `fecha` solo se rechazan si se solapan (`ts_inicio < f.ts_fin and ts_fin > f.ts_inicio`, mensaje «Se solapa con otro turno»); el chequeo de descanso se aplica solo a turnos de otras fechas. Si es false, se mantiene la lógica actual.
- `configuracion.tsx` (`Parametros`): nueva fila con `Switch`, incluida en el modo editar / guardar existente.
- `src/lib/datos.ts`: añadir el campo al tipo de parámetros.
- Prueba: con el parámetro activo, dos turnos sin solape el mismo día se aceptan y con solape se rechazan.
