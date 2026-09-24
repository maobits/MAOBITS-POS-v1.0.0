# Plano de armado

MAOBITS POS se construye como un mueble: cada hito es una pieza y los contratos son sus uniones.

```text
UI → Service → Repository → SQLite
```

Los módulos nunca deben saltarse esta frontera para acceder directamente a la persistencia desde una pantalla. Esto permite enseñar cada parte por separado y sustituir en el futuro el origen local por una combinación Local + Remote.

## Capas

- `app/`: rutas y composición visual.
- `src/modules/`: reglas de negocio por dominio.
- `src/core/`: capacidades transversales estables.
- `src/stores/`: estado temporal de UI/sesión/carrito.
- `course/modules/`: representación pedagógica de cada hito.
- `maobits-room/`: grafo de ensamblaje portable.

## Regla de desmontaje

Para enseñar una pieza, utilizar su `module.manifest.json`. El manifiesto es la lista canónica de archivos y dependencias. No se copian internals de otro módulo: se consume su contrato.
