# Color del local en las fichas del equipo

## Problema

Las fichas de arriba (las que se arrastran a los turnos) ya llevan el color del local, pero casi no se ve: el borde gris normal de la ficha tapa la franja de color., que no lo tape

## Qué cambia

- Cada ficha lleva un fondo suave del color de su local: azul pizarra para la Tienda y ciruela para el Wine Bar.
- Arriba de cada ficha va una barra gruesa de color. Quien trabaja en los dos locales lleva la barra mitad azul y mitad ciruela.
- Junto al nombre aparece una etiqueta pequeña: «Tienda», «Wine Bar» o «Ambos».
- Al seleccionar una ficha sigue viéndose en tinto, para saber cuál está elegida, pero sin perder la barra de color.
- Los nombres ya asignados dentro de los turnos y la leyenda de abajo no cambian.
- los que hacen turnos de cocina junto al nombre pon un dibujo de un gorro de cocina y en los sumillers un racimo de uvas

## Detalles técnicos

- En `planificador.tsx`, `colorLocal` se reemplaza por un helper que devuelve el tipo de local (`tienda` | `winebar` | `ambos`) a partir de `persona.locales`.
- La ficha deja de depender de `border-l-*`, que choca con `border-border`. Se usa `bg-tienda/10` o `bg-winebar/10`, y una barra absoluta de `h-1.5` arriba (en «ambos», con gradiente de `--tienda` a `--winebar`).
- La etiqueta va en `text-[10px]` con `text-tienda` o `text-winebar`.
- Solo se usan los tokens que ya existen. Se comprobará con una captura del planificador como Encargado.