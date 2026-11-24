# Que una persona nueva aparezca en Personal y en el Planificador

## Lo que ya comprobé
- «juan» (Wine Bar) sí quedó guardado en el equipo.
- La lista de Personal y las fichas del Planificador leen el mismo listado de personas, sin filtros que la oculten.

Así que la causa todavía no está confirmada. Puede ser que la pantalla no se refresque después de agregar a alguien.

## Pasos
1. **Reproducir** en el navegador entrando como administración: agregar una persona en Configuración → Personal, comprobar si sale en la lista y luego abrir el Planificador sin recargar.
2. **Corregir según lo que se vea**:
   - Si es un problema de refresco: después de agregar, editar o borrar a alguien, actualizar al momento la lista y las fichas del Planificador, y mostrar a la persona nueva arriba con un aviso de «agregada».
   - Si el guardado falla en silencio (por ejemplo, una clave repetida o un usuario sin permiso): mostrar el error con claridad y no vaciar el formulario.
   - Si la persona se agrega sin local: avisar que hay que marcar al menos un local para poder asignarle turnos.
3. **Verificar** el mismo recorrido de nuevo, con capturas de pantalla de Personal y del Planificador.

## Detalles técnicos
- Archivos: `configuracion.tsx` (formulario de Personal) y, si hace falta, `src/lib/datos.ts`.
- Esperar a `invalidateQueries` (refrescar los datos guardados) y solo después limpiar el formulario; exigir al menos un local.
- No hay cambios en la base de datos.
