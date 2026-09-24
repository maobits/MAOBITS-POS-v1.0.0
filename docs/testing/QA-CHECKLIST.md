# QA Checklist — MAOBITS POS v1.0.0 Expo Premium

## A. Toolchain

- [ ] `npm install` completa y refresca `package-lock.json`.
- [ ] `npm run verify:source`.
- [ ] `npm run verify:legacy`.
- [ ] `npm run verify:structure`.
- [ ] `npm run course:verify`.
- [ ] `npm run typecheck` sin errores.
- [ ] `npm test`: 7 archivos / 23 casos esperados.
- [ ] `npm run doctor`: 21/21 o advertencias justificadas explícitamente.

## B. Instalación / migración

- [ ] Instalación limpia crea esquema 001–003.
- [ ] Reinicio mantiene configuración y datos.
- [ ] Base legacy real se detecta automáticamente.
- [ ] Productos/clientes/ventas/pagos/inventario/caja legacy se conservan.
- [ ] Usuario ADMIN legacy migra a rol Administrador.
- [ ] Usuario CASHIER legacy migra a rol Cajero.
- [ ] Primer login legacy actualiza hash/salt de PIN.
- [ ] `foreign_key_check` no reporta errores.

## C. UX premium / accesibilidad

- [ ] Dashboard legible en teléfono.
- [ ] Dashboard legible en tablet.
- [ ] POS usa carrito flotante en móvil.
- [ ] POS usa layout lateral en ancho amplio.
- [ ] Controles táctiles cómodos.
- [ ] Teclado no cubre inputs críticos.
- [ ] Estados empty/loading/error visibles.
- [ ] Light/Dark/System conservan contraste.
- [ ] ES ↔ EN no rompe layouts.
- [ ] No aparece texto funcional sin traducir.

## D. Seguridad / permisos

- [ ] Crear/editar/desactivar usuario.
- [ ] Crear rol personalizado.
- [ ] Rol de sistema no puede alterarse indebidamente.
- [ ] `PRODUCT_COST_VIEW` oculta costo/margen en UI.
- [ ] Service impide modificación indirecta del costo.
- [ ] Compras respetan permisos de costo.
- [ ] Operaciones protegidas fallan sin permiso aunque se invoquen fuera de UI.

## E. Catálogo

- [ ] CRUD categorías + búsqueda + paginación.
- [ ] CRUD proveedores + búsqueda + paginación.
- [ ] Logo proveedor persiste tras reinicio.
- [ ] CRUD producto.
- [ ] Selector de categoría modal.
- [ ] Múltiples proveedores.
- [ ] Múltiples imágenes.
- [ ] Imagen destacada.
- [ ] EAN-13 generado y validado.
- [ ] Etiqueta PDF.
- [ ] Print/share etiqueta.
- [ ] Mini reporte producto.

## F. Inventario

- [ ] Compra vinculada a proveedor.
- [ ] Ajuste de entrada/salida.
- [ ] Stock resultante correcto.
- [ ] Ledger conserva before/after.
- [ ] Alertas stock mínimo/agorado.
- [ ] Costos solo visibles con permiso.

## G. Clientes / cuenta corriente

- [ ] CRUD activo/inactivo.
- [ ] Historial de compras.
- [ ] Saldo inicial correcto.
- [ ] Crédito a favor correcto.
- [ ] Deuda correcta.
- [ ] Abono afecta cuenta y caja cuando corresponde.
- [ ] Ledger reconstruye saldo.

## H. POS / Checkout

- [ ] Búsqueda y categorías.
- [ ] Paginación.
- [ ] Agregar producto muestra feedback.
- [ ] Eliminar + Deshacer.
- [ ] Incrementar/disminuir cantidad.
- [ ] Scanner agrega producto correcto.
- [ ] Cliente puede seleccionarse/crearse en checkout.
- [ ] Deuda anterior NO altera el total contable de la nueva venta.
- [ ] Saldo a favor reduce pagable correctamente.
- [ ] Pago parcial crea solo deuda nueva.
- [ ] Venta a crédito requiere cliente.
- [ ] Fallo inducido produce ROLLBACK completo.

## I. Caja / ventas

- [ ] Abrir caja.
- [ ] Segunda caja incompatible es rechazada.
- [ ] Venta efectivo incrementa caja.
- [ ] Ingreso/retiro manual funciona con permiso.
- [ ] Arqueo esperado vs contado.
- [ ] Cierre impide nuevas ventas en esa sesión.
- [ ] Filtros Hoy/Ayer/Semana/Mes/Semestre/Año.
- [ ] Filtros avanzados usuario/cliente/estado/método.
- [ ] Reversión conserva venta original.
- [ ] Reversión restaura stock.
- [ ] Reversión corrige caja.
- [ ] Reversión corrige cuenta cliente.

## J. PDF / reportes

- [ ] Ticket PDF correcto.
- [ ] Print real.
- [ ] Share real.
- [ ] Dashboard usa SQLite real.
- [ ] Barras/línea/donut renderizan bien.
- [ ] Reporte categorías.
- [ ] Reporte proveedores/compras.
- [ ] Reporte deuda/crédito.

## K. Backup / restore

- [ ] Backup incluye tablas.
- [ ] Backup incluye product images.
- [ ] Backup incluye supplier logos.
- [ ] Archivo puede compartirse por sheet nativo.
- [ ] Restore rechaza formato/version inválidos.
- [ ] Restore rechaza backup al que le falta media referenciada.
- [ ] Restore en instalación limpia recupera datos + medios.
- [ ] Datos persisten después de reiniciar.

## L. Administración

- [ ] Carga demo exige PIN + `CARGAR DATOS DEMO`.
- [ ] Purga exige PIN + `ELIMINAR TODOS LOS DATOS`.
- [ ] Purga conserva usuarios/roles/permisos/settings necesarios.
- [ ] COP/USD/EUR cambian formato sin alterar minor units.

## M. MAOBITS Room

- [ ] 15 módulos visibles.
- [ ] 105 escenas válidas.
- [ ] `course:export -- hito-06-products` exporta módulo aislado.
- [ ] Módulo exportado conserva source paths/lesson/slides.
- [ ] `assembly-graph.json` explica dependencias funcionales.
- [ ] `ui-assembly-map.json` explica ensamblaje visual.
- [ ] Cada lección conserva necesidad → concepto → contrato → implementación → prueba → ensamblaje → checkpoint.
