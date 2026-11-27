# Habilidades sin distinguir mayúsculas, llave para encargado y planear la semana siguiente

## 1. Habilidades sin importar mayúsculas
- Al validar una asignación, «cocina», «Cocina» o « COCINA » cuentan igual (también en la cata del jueves y en cualquier franja con requisito).
- Al guardar una persona o franja, las habilidades se limpian de espacios sobrantes y se evitan duplicados que solo difieren en mayúsculas.
- Se corrigen las fichas actuales (por ejemplo, Julián podrá ir a Cocina sin tocar nada).

## 2. Símbolo de llave para el encargado
- Llave dorada junto al nombre de quien tenga la habilidad «Encargado» (sin importar mayúsculas), junto al gorro y las uvas.
- Se ve en las fichas del Planificador y en Configuración → Personal.
- Para marcar a alguien: Configuración → Personal → Editar → añadir «Encargado» en habilidades.

## 3. Planear la semana siguiente
- Botón «Nueva semana» en el Planificador (encargado y admin) que crea la semana siguiente a la última existente (ahora: lunes 30 nov).
- Copia las franjas de la última semana (horarios, cobertura, requisitos) con sus fechas nuevas, vacías de personas. Lunes de Wine Bar no se copia si la semana base no lo tenía.
- La nueva semana queda seleccionada y abierta para asignar; las demás reglas (descanso 11h entre semanas, 6 días seguidos) se siguen aplicando.

## Detalles técnicos
- `validar_asignacion`: comparar con `lower(trim())` sobre `persona.habilidades` vs `habilidad_requerida`. Migración que normaliza con trim los arrays existentes.
- `HabilidadesIconos`: añadir `esEncargado` + icono `KeyRound` en color ámbar (`text-alerta`/dorado de marca).
- Nuevo tipo de comando `crear_semana` en `ejecutar_comando` (staff, idempotente): inserta `semana` (id = última + 7 días) y duplica `franja` ajustando `fecha`, `ts_inicio`, `ts_fin`. Rechaza si ya existe.
- Planificador: botón que llama `ejecutar("crear_semana", {})`, refresca y selecciona la nueva semana.
