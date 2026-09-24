# MAOBITS POS v1.0.0 — Expo Premium Modular

Aplicación móvil profesional de punto de venta **100% Expo / React Native**, local-first y offline-first, desarrollada para **Instituto Maobits S.A.S. — NIT 902010335-7**.

La experiencia visual fue reconstruida desde cero tomando como referencia de UX una interfaz React + Tailwind + Vite suministrada por el propietario del proyecto. **Tailwind, Vite, DOM y mocks web no forman parte del runtime móvil.** La app móvil usa componentes React Native, Expo Router, SQLite, tokens de diseño y Services/Repositories reales.

## Objetivo doble

1. **Producto real:** POS móvil utilizable sin backend obligatorio.
2. **Producto educativo:** código desmontable y reensamblable en MAOBITS Room, basado en hitos y escenas de diapositivas.

## Arquitectura

```text
Screen / Route
      ↓
   Service
      ↓
 Repository
      ↓
SQLite / Local Data Source
```

Preparada para evolucionar a:

```text
Repository
├── LocalDataSource / SQLite
└── RemoteDataSource / API
```

Las rutas de UI no ejecutan SQL directamente. Los Services coordinan reglas, permisos y transacciones; los Repositories encapsulan persistencia.

## Diseño premium nativo

La GUI se construye por capas:

```text
Design Tokens
    ↓
UI Primitives
    ↓
Reusable Patterns
    ↓
Screens
    ↓
Domain Modules
```

Incluye:

- paleta semántica indigo/cyan/slate + success/warning/danger;
- tarjetas y superficies con jerarquía visual clara;
- controles táctiles accesibles (mínimo 44 px);
- navegación adaptativa móvil/tablet;
- modo claro/oscuro/sistema;
- feedback, badges, métricas, modales, empty states y loaders;
- POS responsive con carrito lateral en tablet y flotante en móvil;
- teclado protegido mediante `KeyboardAvoidingView`;
- ES/EN desde i18n, sin Tailwind ni HTML de interfaz.

Consulta `docs/architecture/UX-DESIGN-SYSTEM.md` y `maobits-room/ui-assembly-map.json`.

## Alcance funcional

- Configuración inicial del negocio.
- Login local por PIN con hash/salt.
- Migración automática del esquema legacy de MAOBITS POS v1.
- Usuarios, roles personalizados y 20 permisos granulares.
- `PRODUCT_COST_VIEW` protegido en UI y Services.
- Categorías con búsqueda, paginación y reportes.
- Proveedores con logo persistente y compras asociadas.
- Productos con múltiples proveedores, múltiples imágenes e imagen destacada.
- EAN-13, validación, generación y etiqueta PDF/print/share.
- Inventario por ledger de movimientos, compras, ajustes y alertas.
- Clientes activos/inactivos, historial y cuenta corriente.
- Deuda, saldo a favor y abonos con trazabilidad.
- POS con búsqueda, categorías, paginación, toast, deshacer, scanner y carrito.
- Checkout atómico con cliente, saldo, crédito y pagos.
- Caja por turnos exclusivos, movimientos, arqueo y cierre.
- Historial de ventas con filtros rápidos/avanzados.
- Reversión transaccional de venta, inventario, caja y cuenta cliente.
- Ticket PDF, impresión y compartir.
- Dashboard y reportes locales con barras, línea y donut.
- Backup integral versionado con datos + medios y restauración validada.
- ES/EN, COP/USD/EUR y tema.
- Datos demo y purga protegidos por PIN + confirmación literal.

## MAOBITS Room

`course/modules/` contiene **15 módulos pedagógicos** y **105 escenas**. Cada módulo conserva manifiesto, lección, dependencias y rutas de código para enseñar:

```text
NECESIDAD → CONCEPTO → CONTRATO → IMPLEMENTACIÓN → PRUEBA → ENSAMBLAJE → CHECKPOINT
```

Ver:

- `docs/course/ASSEMBLY-GUIDE.md`
- `docs/course/UX-SLIDE-ASSEMBLY.md`
- `maobits-room/assembly-graph.json`
- `maobits-room/ui-assembly-map.json`

## Instalación

Requisitos recomendados:

- Node.js 22.x compatible con Expo SDK 57.
- npm 10+.
- Android Studio/emulador o Expo Go/dispositivo compatible para QA nativo.

```bash
npm install
npm run verify:all
npx expo start -c
```

> No utilices `npm audit fix --force` para resolver incompatibilidades.

El lockfile incluido procede de la base anterior y debe refrescarse con el primer `npm install` porque el entorno de generación no tuvo acceso de red al registro npm. Consulta `LOCKFILE-STATUS.md`.

## Verificación sin node_modules

```bash
python3 scripts/validate-source.py
python3 scripts/validate-legacy-migration.py
node scripts/verify-structure.mjs
node scripts/check-course-contracts.mjs
npx tsc -p tsconfig.validate.json
```

Estas verificaciones fueron ejecutadas en la generación premium y pasaron.

## QA real pendiente

`IMPLEMENTADO` no equivale a `VALIDADO`. Después de `npm install` deben ejecutarse en tu Ubuntu:

```bash
npm run typecheck
npm test
npm run doctor
npx expo start -c
```

Y validar en dispositivo/emulador cámara, Image Picker, PDF/print, Share, backup/restore y los flujos de negocio completos.

## Créditos

**MAOBITS POS — Versión 1.0.0**  
Instituto Maobits S.A.S.  
NIT 902010335-7
