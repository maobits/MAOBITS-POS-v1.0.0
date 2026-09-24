#!/usr/bin/env bash
set -euo pipefail
printf '\nMAOBITS POS · bootstrap + verify\n'
npm install
npm run typecheck
npm test
npm run verify:structure
npm run verify:source
npm run course:verify
npm run doctor
printf '\nCheckpoints automáticos completados. Continúa con QA nativo.\n'
