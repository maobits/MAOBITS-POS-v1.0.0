# Contratos de módulos

- **UI:** presenta y captura intención; no ejecuta SQL.
- **Service:** reglas, autorización y coordinación transaccional.
- **Repository:** persistencia y consultas.
- **SQLite:** fuente de verdad local.
- **Store:** estado temporal de interfaz; nunca reemplaza SQLite.

Este contrato es también el contrato pedagógico del curso: una diapositiva puede enfocarse en una capa sin confundirla con las demás.
