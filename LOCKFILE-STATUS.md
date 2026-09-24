# Estado de package-lock.json

## Situación

`package.json` contiene todas las dependencias directas de la reconstrucción Expo Premium. El entorno donde se generó este paquete no tuvo acceso DNS al registro npm, por lo que no fue posible regenerar de forma fiable todo `package-lock.json` después de añadir los módulos visuales/nativos nuevos.

El lockfile incluido se conserva como referencia de la base SDK 57, pero **no debe utilizarse con `npm ci` antes del primer refresh**.

## Primer uso en Ubuntu

Ejecuta:

```bash
npm install
```

npm resolverá las versiones compatibles declaradas y actualizará `package-lock.json`.

Después:

```bash
npm run verify:all
```

Si todo queda verde, guarda/versiona ese nuevo `package-lock.json`. A partir de entonces sí puede usarse:

```bash
npm ci
```

## Regla

No usar `npm audit fix --force` para fabricar compatibilidad. Corregir siempre la causa raíz.
