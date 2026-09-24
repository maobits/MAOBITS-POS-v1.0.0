# MAOBITS POS — Guía de ensamblaje para MAOBITS Room

## Objetivo
El repositorio está diseñado para convertirse en un curso basado en diapositivas y escenas. La aplicación final es el **mueble armado**; cada carpeta de `course/modules/` describe una pieza desmontable.

## Regla de oro
**No copiar pantallas completas como lección.** Enseñar primero necesidad y contrato, luego el cambio mínimo de código y finalmente el ensamblaje.

## Unidad visual estándar
Cada hito se representa en siete escenas: `NECESIDAD → CONCEPTO → CONTRATO → CÓDIGO → SIMULACIÓN → ENSAMBLAJE → CHECKPOINT`.

## Tres modos Guided Code
- **CALCO:** ghost code solo para la pieza nueva.
- **COMPLETAR:** código real con huecos.
- **AUTÓNOMO:** no mostrar la solución anticipadamente.

## Desmontaje
Una pieza se puede aislar para enseñanza porque su dependencia se declara en `module.manifest.json`. La UI nunca debe reemplazar al Service y el Service nunca debe depender de una pantalla.

## Ensamblaje acumulativo
HITO 1 crea bastidor. HITO 2 agrega persistencia. HITO 3 agrega identidad. Cada hito posterior **consume** los anteriores; no se vuelven a inventar. Esto permite que las diapositivas muestren un antes/después verificable.
