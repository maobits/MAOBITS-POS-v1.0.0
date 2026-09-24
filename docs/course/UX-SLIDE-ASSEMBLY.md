# UX Premium — Guía de escenas para MAOBITS Room

## Objetivo

Convertir el sistema visual Expo en unidades de diapositivas reutilizables sin acoplarlas a Tailwind ni a la referencia web original.

## Secuencia recomendada de escenas

1. **Problema** — una app técnicamente correcta puede ser difícil de usar.
2. **Referencia visual** — identificar jerarquía, spacing, estados y patrones.
3. **Tokens** — convertir decisiones visuales en constantes reutilizables.
4. **Primitive** — construir una pieza pequeña como `Card` o `Button`.
5. **Pattern** — ensamblar primitives en un KPI, toolbar o selector.
6. **Screen** — organizar patrones en Dashboard/POS/Inventario.
7. **Contrato** — conectar la Screen con un Service real.
8. **Accesibilidad** — touch target, contraste, teclado y feedback.
9. **Responsive** — móvil vs tablet sin duplicar lógica.
10. **Checkpoint** — probar que la pantalla sigue funcionando con datos SQLite reales.

## Piezas especialmente apropiadas para diapositivas

- Splash + bootstrap SQLite.
- Login numérico seguro.
- MetricCard.
- ProductCard.
- SearchBar + filtros.
- Carrito lateral vs flotante.
- Customer split-view.
- Checkout atómico.
- Cash hero card.
- Report charts SVG.
- Permission badge / costo protegido.
- Backup card y restore warning.

## Regla

La diapositiva visual nunca sustituye el contrato funcional. Un botón visible en el curso debe apuntar al mismo Service que utiliza la aplicación real.
