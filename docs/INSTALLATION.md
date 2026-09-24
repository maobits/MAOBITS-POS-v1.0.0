# Instalación — MAOBITS POS v1.0.0 Expo Premium

```bash
cd MAOBITS-POS-v1.0.0
npm install
npm run verify:all
npx expo start -c
```

En una base de datos existente de la versión anterior, no borres datos como primer paso. El bootstrap detecta el esquema legacy y ejecuta el puente de migración antes del ledger modular.

Si se prueba con Expo Go/dispositivo, valida cámara, permisos, Image Picker, Print y Share además del flujo de negocio.
