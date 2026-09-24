# HITO 15 — QA y MAOBITS Room

## Propósito
Esta pieza existe para enseñar y ensamblar **QA y MAOBITS Room** sin obligar al estudiante a comprender todo MAOBITS POS al mismo tiempo.

## Dependencias
- foundation
- database
- security
- permissions
- catalog-base
- products
- inventory
- customers
- pos
- checkout
- cash
- sales
- reports
- backup-settings

## Conceptos
- testing
- assembly
- slides
- release

## Archivos principales
- `tests`
- `scripts`
- `docs/course`
- `maobits-room`

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
