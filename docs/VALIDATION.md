# Validación

## Fuente / arquitectura

```bash
python3 scripts/validate-source.py
python3 scripts/validate-legacy-migration.py
node scripts/verify-structure.mjs
node scripts/check-course-contracts.mjs
npx tsc -p tsconfig.validate.json
```

## SDK real

```bash
npm install
npm run typecheck
npm test
npm run doctor
```

## Runtime

```bash
npx expo start -c
```

Completa `docs/testing/QA-CHECKLIST.md` en Android y/o iOS antes de declarar una release validada.
