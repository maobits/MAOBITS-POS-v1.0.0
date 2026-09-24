# Seguridad local

MAOBITS POS v1.0.0 es local-first. Sus controles reducen errores y acceso casual en un dispositivo compartido, pero no sustituyen la seguridad de identidad de un backend.

- PIN no se guarda en texto plano: se combina con salt y hash.
- Los permisos se comprueban en UI **y nuevamente en Services**.
- `PRODUCT_COST_VIEW` protege costo y datos derivados.
- Cargar demo exige PIN administrador + `CARGAR DATOS DEMO`.
- Purga exige PIN administrador + `ELIMINAR TODOS LOS DATOS`.
- La purga conserva usuarios, roles, permisos y configuración base.
- No almacenar secretos remotos en el repositorio.

Para un backend futuro se debe incorporar autenticación remota, rotación/revocación y un KDF de contraseñas adecuado del lado servidor.
