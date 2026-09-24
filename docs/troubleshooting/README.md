# Troubleshooting

## Expo indica incompatibilidad de paquetes

Ejecuta `npx expo install --fix`, revisa el diff de `package.json` y vuelve a ejecutar `npm run doctor`. No uses `--force` para silenciar incompatibilidades.

## SQLite falla al iniciar

Revisa migraciones y `schema_migrations`. No modifiques tablas desde las pantallas.

## Cámara o imágenes no funcionan

Prueba en dispositivo/emulador con permisos concedidos. Expo Web no representa todos los contratos nativos.

## Backup no restaura

Confirma `format = maobits.pos.backup` y `backupVersion = 1`. No edites manualmente el JSON.
