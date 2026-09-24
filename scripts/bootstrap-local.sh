#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' '==> MAOBITS POS v1.0.0 — Bootstrap local'
printf '%s\n' 'Instalando dependencias sin --force...'
npm install

printf '%s\n' 'Ejecutando verificación completa...'
npm run verify:all

printf '%s\n' 'PASS  Bootstrap y QA de toolchain completados.'
printf '%s\n' 'Siguiente paso: npx expo start -c'
