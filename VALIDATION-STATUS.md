# Estado de validación — MAOBITS POS v1.0.0 Expo Premium

## VALIDADO / PROBADO en generación

| Checkpoint | Estado |
|---|---|
| Estructura modular | ✅ PROBADO |
| 15 manifiestos MAOBITS Room | ✅ PROBADO |
| 105 escenas de curso | ✅ PROBADO |
| 20 permisos | ✅ PROBADO |
| Migraciones SQLite 001–003 | ✅ PROBADO |
| Constraints: una caja abierta / precio >= 0 | ✅ PROBADO |
| EAN-13 demo | ✅ PROBADO |
| Frontera UI → Service → Repository | ✅ AUDITADO |
| Ausencia de DOM/Tailwind en rutas Expo | ✅ AUDITADO |
| Ruta Expo Router sin `src/app` | ✅ AUDITADO |
| Migración legacy → modular | ✅ PROBADA con SQLite real simulado |
| Foreign key check de migración legacy | ✅ PROBADO |
| i18n ES/EN de contratos premium | ✅ AUDITADO / pruebas definidas |
| Typecheck auxiliar con stubs | ✅ PASA |

## Pruebas definidas

7 archivos Vitest / **23 casos**:

- checkout math;
- checkout edge cases;
- EAN-13;
- money;
- permissions;
- i18n contract;
- design-system accessibility/tokens.

Estos 23 casos deben ejecutarse nuevamente con `npm test` después del `npm install` real en Ubuntu.

## PENDIENTE de entorno real

```bash
npm install
npm run typecheck
npm test
npm run doctor
npx expo start -c
```

## PENDIENTE de dispositivo/emulador

- arranque limpio y migración de una base legacy real;
- setup/login/logout;
- navegación móvil/tablet;
- cámara/scanner;
- Image Picker y persistencia de imágenes;
- etiqueta EAN PDF/print/share;
- compra/inventario;
- POS y checkout real;
- venta normal, saldo a favor y venta a crédito;
- caja y cierre;
- reversión de venta;
- ticket PDF/print/share;
- backup + restauración extremo a extremo;
- ES/EN;
- COP/USD/EUR;
- tema claro/oscuro/sistema;
- teclado y accesibilidad en Android/iOS.

## Regla de release

`IMPLEMENTADO` ≠ `VALIDADO`.

La fuente premium es una entrega completa de implementación, pero no debe etiquetarse como release de producción hasta cerrar los checkpoints nativos anteriores.
