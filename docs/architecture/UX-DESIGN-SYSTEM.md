# MAOBITS POS — Sistema de diseño Expo Premium

## Propósito

La interfaz de MAOBITS POS toma como **referencia de experiencia** una aplicación React + Tailwind + Vite entregada por el propietario del proyecto, pero no copia su stack, DOM, Tailwind, mocks ni acciones simuladas.

La implementación final es React Native + Expo 100% y se organiza para que MAOBITS Room pueda desmontarla y enseñarla por capas.

## Capas de ensamblaje

```text
Design Tokens
    ↓
Primitives
    ↓
Patterns
    ↓
Screens
    ↓
Domain Modules
```

### 1. Design Tokens

`src/core/theme/tokens.ts`

Controla:

- paleta semántica;
- spacing;
- radius;
- tipografía;
- sombras/elevación;
- alturas de control;
- touch targets.

La identidad principal utiliza indigo/cyan, superficies slate y estados emerald/amber/rose.

### 2. Primitives

`src/shared/ui.tsx`

Incluye componentes nativos reutilizables:

- Screen;
- PageHeader;
- Card;
- Button;
- IconButton;
- Input;
- SearchBar;
- MoneyField;
- Badge;
- MetricCard;
- Empty;
- Loader;
- Pager;
- ModalSheet;
- Segmented;
- ProgressBar;
- ListRow;
- Avatar;
- Grid.

### 3. Patterns

Los primitives se combinan en patrones repetibles:

- KPI cards;
- toolbars de búsqueda;
- filtros segmentados;
- grid de catálogo;
- carrito lateral/tablet;
- carrito flotante/móvil;
- formularios por secciones;
- split-view lista/detalle;
- modal bottom-sheet;
- hero card de caja;
- paneles de reportes;
- estados vacíos y feedback.

### 4. Screens

Las pantallas no ejecutan SQL. Obtienen datos mediante Services y Repositories.

### 5. Domain Modules

Cada dominio conserva límites didácticos y técnicos independientes.

## Equivalencias referencia web → Expo

| Referencia React/Tailwind | MAOBITS POS Expo |
|---|---|
| `div` card rounded/shadow | `Card` |
| Tailwind button variants | `Button` variants |
| `Badge` web | `Badge` nativo |
| CSS grid | `Grid` + `useWindowDimensions` |
| sidebar | tabs móviles + módulo “Más” + layouts adaptativos |
| `hover:*` | estados pressed + haptics + feedback |
| `<input>` | `Input` / `MoneyField` |
| `<select>` | `ModalSheet` + selector accesible |
| modal fixed/backdrop | `ModalSheet` nativo |
| table | cards/listas responsivas para pantallas táctiles |
| browser alert demo | Service real + transacción SQLite + feedback nativo |

## Accesibilidad

Cada control interactivo debe ofrecer:

- área táctil cómoda;
- `accessibilityRole` apropiado;
- `accessibilityLabel` cuando el texto no sea suficiente;
- contraste adecuado en claro/oscuro;
- estados disabled visibles;
- teclado que no tape campos críticos;
- diseño que no dependa exclusivamente del color.

## Regla pedagógica

MAOBITS Room enseña la UI en este orden:

```text
Necesidad visual
→ Token
→ Primitive
→ Pattern
→ Screen
→ Service contract
→ Datos reales
→ Checkpoint
```

No se enseña “copiar una pantalla”. Se enseña cómo ensamblarla.
