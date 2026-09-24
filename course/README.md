# MAOBITS POS — Kit de ensamblaje para MAOBITS Room

Este directorio convierte la aplicación en **piezas didácticas montables**. Cada hito incluye:

- `module.manifest.json`: contrato de la pieza, dependencias y rutas de código.
- `LESSON.md`: propósito pedagógico y secuencia de estudio.
- `slides.json`: siete escenas base listas para transformarse en diapositivas de MAOBITS Room.

## Regla de diseño

Una diapositiva no debe depender de leer toda la app. La progresión es:

`Necesidad → Concepto → Contrato → Código → Simulación → Ensamblaje → Checkpoint`.

## Desarmar una pieza

```bash
npm run course:export -- hito-06-products
```

El script copia únicamente los archivos declarados por el manifiesto a `dist/course-parts/<moduleId>/`, conservando rutas relativas. No altera la aplicación.

## Verificar todos los contratos

```bash
npm run course:verify
```

La verificación falla si un manifiesto referencia una ruta inexistente, si falta una dependencia o si una pieza no tiene sus siete diapositivas.

## Reensamblaje

El orden canónico está en `maobits-room/assembly-graph.json`. Los módulos anteriores son contratos estables; una pieza nueva se ensambla consumiendo sus Services/Repositories en vez de copiar o reescribir código.
