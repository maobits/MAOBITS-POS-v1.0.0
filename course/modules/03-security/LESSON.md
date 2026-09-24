# HITO 3 — Seguridad y sesión

## Propósito
Esta pieza existe para enseñar y ensamblar **Seguridad y sesión** sin obligar al estudiante a comprender todo MAOBITS POS al mismo tiempo.

## Dependencias
- database

## Conceptos
- PIN
- salt
- hash
- session

## Archivos principales
- `src/core/security`
- `src/modules/auth`
- `src/modules/users`

## Secuencia de diapositivas
1. Necesidad real.
2. Concepto visual.
3. Contrato de entrada/salida.
4. Código incremental.
5. Simulación.
6. Ensamblaje.
7. Checkpoint.

## Regla de desmontaje
La escena del curso puede retirar visualmente esta pieza siempre que mantenga explícitos sus contratos. El código de módulos anteriores no se reescribe; se consume mediante sus Services/Repositories.

## Checkpoint
El módulo no pasa a `VALIDADO` solo por compilar. Debe superar sus pruebas y, si usa APIs nativas, la prueba en dispositivo.
