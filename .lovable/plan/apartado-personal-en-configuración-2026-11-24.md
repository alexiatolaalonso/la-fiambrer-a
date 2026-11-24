# Apartado «Personal» en Configuración

Nueva pestaña **Personal** en Configuración (junto a Franjas, Tarifas, Parámetros, Locales y Puestos).

## Qué se podrá hacer
- **Ver la lista del equipo**: alias, email, locales donde trabaja (con su color: Tienda azul, Wine Bar ciruela, ambos), habilidades y tope semanal de horas.
- **Editar a cada persona**: cambiar alias, email, marcar locales (casillas por cada local existente), habilidades (separadas por comas, p. ej. «Catas y servicio de vino») y tope semanal.
- **Agregar persona**: clave, alias, email, locales, habilidades y tope (por defecto el tope de Parámetros).
- **Borrar persona**: con confirmación; si tiene turnos asignados se mostrará el motivo del rechazo.

## Permisos
- Solo administración puede crear, editar o borrar personal (ya lo exige el sistema). Para encargados la pestaña se muestra en solo lectura.

## Detalles técnicos
- Todo en `src/routes/_authenticated/configuracion.tsx`, mismo estilo que Locales/Puestos (`useGuardar`, `supabase.from("persona")`).
- Usa `useSesion()` para saber si es admin; sin cambios en base de datos.
- Los cambios de locales/habilidades afectan a validaciones futuras; los turnos ya asignados no se modifican.
