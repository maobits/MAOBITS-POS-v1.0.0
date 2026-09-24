# DELIVERY — MAOBITS POS v1.0.0 Expo Premium

## Qué contiene esta entrega

Reconstrucción completa de la aplicación móvil con **Expo / React Native**, conservando la arquitectura modular de dominio y reemplazando la GUI simple por un sistema visual premium, responsive y accesible.

La app React + Tailwind + Vite suministrada se utilizó únicamente como referencia de experiencia visual. Sus mocks, DOM, Tailwind y acciones simuladas no se portaron como lógica de producto.

## Capas entregadas

- `app/`: rutas Expo Router y pantallas premium.
- `src/core/`: SQLite, migraciones, seguridad, i18n, money, theme, backup, media, barcode y PDF.
- `src/modules/`: Services/Repositories por dominio.
- `src/shared/`: primitives UI y componentes gráficos reutilizables.
- `tests/`: 7 archivos de prueba / 23 casos definidos.
- `course/modules/`: 15 módulos de curso.
- `maobits-room/`: grafos de ensamblaje técnico y visual.
- `docs/`: arquitectura, seguridad, DB, UX, QA y guías de curso.
- `scripts/`: validadores, exportador de módulos y bootstrap.

## Verificado en el entorno de generación

- `validate-source.py`: PASA.
- migraciones SQLite 001–003: ejecutables.
- constraints SQLite críticos: PASAN.
- migración legacy simulada contra SQLite real: PASA.
- 20 permisos presentes.
- Expo Router: root canónica `app/`, sin colisión `src/app`.
- UI routes sin imports directos de SQLite.
- UI Expo sin DOM/Tailwind en runtime.
- contrato i18n de props visibles: verificado estáticamente.
- `verify-structure.mjs`: PASA.
- `check-course-contracts.mjs`: 15 módulos / 105 escenas PASAN.
- `tsc -p tsconfig.validate.json`: PASA con stubs de validación.

## No se afirma todavía

No se etiqueta la entrega como **release validada en hardware**. El entorno de generación no pudo instalar dependencias desde npm, por lo que el typecheck SDK real, Vitest real de la reconstrucción premium, Expo Doctor y pruebas nativas deben ejecutarse en la máquina de desarrollo.

Consulta `VALIDATION-STATUS.md` y `docs/testing/QA-CHECKLIST.md`.
