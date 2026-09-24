import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Currency, Locale, SaleDetail } from '@/core/types';
import { formatMoney } from '@/core/money';
import { cashMovementLabel } from '@/modules/cash/labels';

export interface TicketBranding {
  businessName: string;
  logoDataUri?: string | null;
}

export interface CashTicketMovement {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface CashTicketData {
  id: string;
  user_name: string;
  opened_at: string;
  opening_amount: number;
  closed_at: string | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference: number | null;
  notes: string | null;
  movements: CashTicketMovement[];
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] ?? char));
}

function safePdfFileName(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);

  return normalized || 'MAOBITS-POS';
}

function brandingHeader(branding: TicketBranding) {
  const logo = branding.logoDataUri
    ? `<img src="${branding.logoDataUri}" style="max-width:34mm;max-height:18mm;object-fit:contain;margin:0 auto 3mm;display:block"/>`
    : `<div class="logoText">MAOBITS</div>`;

  return `
    <div class="brand">
      ${logo}
      <div class="business">${esc(branding.businessName)}</div>
      <div class="muted">MAOBITS POS</div>
    </div>
  `;
}

const ticketCss = `
  @page { margin: 0; size: 80mm auto; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: 80mm;
    padding: 5mm 4mm 7mm;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    color: #111827;
    font-size: 10.5px;
    line-height: 1.35;
  }
  .brand { text-align: center; margin-bottom: 4mm; }
  .business { font-size: 17px; font-weight: 900; letter-spacing: -0.2px; }
  .logoText { font-weight: 1000; font-size: 18px; letter-spacing: 2px; color: #4f46e5; margin-bottom: 2mm; }
  .muted { color: #64748b; }
  .tiny { font-size: 9px; color: #64748b; }
  .rule { border-top: 1px dashed #94a3b8; margin: 3mm 0; }
  .double { border-top: 2px solid #111827; margin: 3mm 0; }
  .row { display:flex; justify-content:space-between; gap:3mm; margin:1.2mm 0; }
  .row > :last-child { text-align:right; }
  .label { color:#64748b; }
  .strong { font-weight:900; }
  .grand { font-size:18px; font-weight:1000; }
  .item { margin: 2.4mm 0; }
  .itemName { font-weight:800; }
  .itemMeta { display:flex; justify-content:space-between; gap:2mm; color:#475569; margin-top:.7mm; }
  .status { display:inline-block; border:1px solid #cbd5e1; border-radius:999px; padding:1mm 2mm; font-size:9px; font-weight:800; }
  .footer { text-align:center; margin-top:4mm; font-size:9px; color:#64748b; }
`;

function htmlDoc(body: string, title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${ticketCss}</style></head><body>${body}</body></html>`;
}

export function receiptHtml(
  sale: SaleDetail,
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  const items = sale.items.map((item) => `
    <div class="item">
      <div class="itemName">${esc(item.product_name)}</div>
      <div class="itemMeta">
        <span>${item.quantity} × ${formatMoney(item.unit_price, currency, locale)}</span>
        <span class="strong">${formatMoney(item.total, currency, locale)}</span>
      </div>
    </div>
  `).join('');

  const payments = sale.payments.map((payment) => `
    <div class="row">
      <span>${esc(payment.method)}</span>
      <span class="strong">${formatMoney(payment.amount, currency, locale)}</span>
    </div>
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="rule"></div>
    <div class="row"><span class="label">Venta</span><span class="strong">${esc(sale.number)}</span></div>
    <div class="row"><span class="label">Fecha</span><span>${esc(new Date(sale.created_at).toLocaleString())}</span></div>
    <div class="row"><span class="label">Cajero</span><span>${esc(sale.user_name)}</span></div>
    <div class="row"><span class="label">Cliente</span><span>${esc(sale.customer_name ?? 'Cliente mostrador')}</span></div>
    <div class="row"><span class="label">Estado</span><span class="status">${esc(sale.status)}</span></div>
    <div class="rule"></div>
    ${items}
    <div class="double"></div>
    <div class="row"><span class="label">Subtotal</span><span>${formatMoney(sale.subtotal, currency, locale)}</span></div>
    <div class="row"><span class="label">Descuento</span><span>${formatMoney(sale.discount, currency, locale)}</span></div>
    <div class="row"><span class="label">Impuestos</span><span>${formatMoney(sale.tax, currency, locale)}</span></div>
    <div class="row"><span class="grand">TOTAL</span><span class="grand">${formatMoney(sale.total, currency, locale)}</span></div>
    <div class="rule"></div>
    <div class="strong">Pagos</div>
    ${payments || '<div class="tiny">Sin pagos registrados</div>'}
    <div class="row"><span class="label">Pagado</span><span>${formatMoney(sale.paid_total, currency, locale)}</span></div>
    <div class="row"><span class="label">Crédito aplicado</span><span>${formatMoney(sale.applied_credit, currency, locale)}</span></div>
    <div class="row"><span class="label">Nueva deuda</span><span>${formatMoney(sale.new_debt, currency, locale)}</span></div>
    <div class="footer">
      Instituto Maobits S.A.S. · NIT 902010335-7<br/>
      Documento generado por MAOBITS POS
    </div>
  `, sale.number);
}

export function cashReceiptHtml(
  summary: CashTicketData,
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  const movements = summary.movements.map((movement) => `
    <div class="item">
      <div class="row">
        <span class="itemName">${esc(cashMovementLabel(movement.type, locale))}</span>
        <span class="strong">${formatMoney(movement.amount, currency, locale)}</span>
      </div>
      <div class="tiny">${esc(new Date(movement.created_at).toLocaleString())}${movement.note ? ` · ${esc(movement.note)}` : ''}</div>
    </div>
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="rule"></div>
    <div class="strong" style="text-align:center;font-size:14px">CIERRE DE CAJA</div>
    <div class="rule"></div>
    <div class="row"><span class="label">Turno</span><span>${esc(summary.id)}</span></div>
    <div class="row"><span class="label">Usuario</span><span>${esc(summary.user_name)}</span></div>
    <div class="row"><span class="label">Apertura</span><span>${esc(new Date(summary.opened_at).toLocaleString())}</span></div>
    <div class="row"><span class="label">Cierre</span><span>${summary.closed_at ? esc(new Date(summary.closed_at).toLocaleString()) : '—'}</span></div>
    <div class="rule"></div>
    <div class="row"><span class="label">Fondo inicial</span><span>${formatMoney(summary.opening_amount, currency, locale)}</span></div>
    <div class="row"><span class="label">Esperado</span><span class="strong">${formatMoney(summary.expected_amount ?? 0, currency, locale)}</span></div>
    <div class="row"><span class="label">Contado</span><span class="strong">${formatMoney(summary.counted_amount ?? 0, currency, locale)}</span></div>
    <div class="row"><span class="grand">DIFERENCIA</span><span class="grand">${formatMoney(summary.difference ?? 0, currency, locale)}</span></div>
    ${summary.notes ? `<div class="tiny">Notas: ${esc(summary.notes)}</div>` : ''}
    <div class="double"></div>
    <div class="strong">Movimientos del turno</div>
    ${movements || '<div class="tiny">Sin movimientos registrados.</div>'}
    <div class="footer">
      Instituto Maobits S.A.S. · NIT 902010335-7<br/>
      Comprobante de cierre · MAOBITS POS
    </div>
  `, `Cierre-${summary.id}`);
}

export async function printReceipt(html: string) {
  return Print.printAsync({ html });
}

export async function shareReceipt(
  html: string,
  fileName = 'MAOBITS-POS-ticket',
) {
  const rendered = await Print.printToFileAsync({ html });
  const source = new File(rendered.uri);

  if (!source.exists || source.size <= 0) {
    throw new Error(
      `PDF_RENDER_FAILED:${rendered.uri}`,
    );
  }

  const target = new File(
    Paths.cache,
    `${safePdfFileName(fileName)}-${Date.now()}.pdf`,
  );

  if (target.exists) {
    target.delete();
  }

  await source.copy(target);

  if (!target.exists || target.size <= 0) {
    throw new Error(
      `PDF_CACHE_COPY_FAILED:${target.uri}`,
    );
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('errors.sharingUnavailable');
  }

  if (Platform.OS === 'android') {
    try {
      await Sharing.shareAsync(target.contentUri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
      });
    } catch {
      await Sharing.shareAsync(target.uri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
      });
    }

    return target.uri;
  }

  await Sharing.shareAsync(target.uri, {
    UTI: 'com.adobe.pdf',
  });

  return target.uri;
}

export interface PurchaseTicketData {
  id: string;
  number: string;
  total: number;
  payment_total: number;
  created_at: string;
  supplier_name: string;
  user_name: string;
  notes: string | null;
  supplier_balance: number;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_cost: number;
    total: number;
  }[];
}

export interface AccountReportEntry {
  id: string;
  type: string;
  impact_minor: number;
  note: string | null;
  created_at: string;
}

export interface CustomerHistoryRow {
  id: string;
  number: string;
  total: number;
  created_at: string;
  status: string;
}

export interface GeneralReportSection {
  title: string;
  rows: { label: string; value: string }[];
}

export function purchaseReceiptHtml(
  purchase: PurchaseTicketData,
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  const items = purchase.items.map((item) => `
    <div class="item">
      <div class="itemName">${esc(item.product_name)}</div>
      <div class="itemMeta">
        <span>${item.quantity} × ${formatMoney(item.unit_cost, currency, locale)}</span>
        <span class="strong">${formatMoney(item.total, currency, locale)}</span>
      </div>
    </div>
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="rule"></div>
    <div class="strong" style="text-align:center;font-size:14px">COMPRA</div>
    <div class="row"><span class="label">Compra</span><span class="strong">${esc(purchase.number)}</span></div>
    <div class="row"><span class="label">Fecha</span><span>${esc(new Date(purchase.created_at).toLocaleString())}</span></div>
    <div class="row"><span class="label">Proveedor</span><span>${esc(purchase.supplier_name)}</span></div>
    <div class="row"><span class="label">Registró</span><span>${esc(purchase.user_name)}</span></div>
    <div class="rule"></div>
    ${items}
    <div class="double"></div>
    <div class="row"><span class="grand">TOTAL</span><span class="grand">${formatMoney(purchase.total, currency, locale)}</span></div>
    <div class="row"><span class="label">Pago registrado</span><span>${formatMoney(purchase.payment_total, currency, locale)}</span></div>
    <div class="row"><span class="label">Saldo proveedor</span><span class="strong">${formatMoney(purchase.supplier_balance, currency, locale)}</span></div>
    ${purchase.notes ? `<div class="tiny">Notas: ${esc(purchase.notes)}</div>` : ''}
    <div class="footer">Compra registrada en MAOBITS POS</div>
  `, purchase.number);
}

export function accountMovementTicketHtml(
  input: {
    title: string;
    partyName: string;
    movementType: string;
    amount: number;
    balance: number;
    createdAt: string;
    note?: string | null;
  },
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="rule"></div>
    <div class="strong" style="text-align:center;font-size:14px">${esc(input.title)}</div>
    <div class="rule"></div>
    <div class="row"><span class="label">Nombre</span><span class="strong">${esc(input.partyName)}</span></div>
    <div class="row"><span class="label">Movimiento</span><span>${esc(input.movementType)}</span></div>
    <div class="row"><span class="label">Fecha</span><span>${esc(new Date(input.createdAt).toLocaleString())}</span></div>
    <div class="row"><span class="grand">MONTO</span><span class="grand">${formatMoney(input.amount, currency, locale)}</span></div>
    <div class="row"><span class="label">Saldo actual</span><span class="strong">${formatMoney(input.balance, currency, locale)}</span></div>
    ${input.note ? `<div class="tiny">Notas: ${esc(input.note)}</div>` : ''}
    <div class="footer">Comprobante de cuenta corriente · MAOBITS POS</div>
  `, input.title);
}

export function customerHistoryReportHtml(
  customerName: string,
  history: CustomerHistoryRow[],
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  const total = history
    .filter((row) => row.status === 'COMPLETED')
    .reduce((sum, row) => sum + row.total, 0);

  const rows = history.map((row) => `
    <div class="item">
      <div class="row"><span class="itemName">${esc(row.number)}</span><span class="strong">${formatMoney(row.total, currency, locale)}</span></div>
      <div class="tiny">${esc(new Date(row.created_at).toLocaleString())} · ${esc(row.status)}</div>
    </div>
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="strong" style="text-align:center;font-size:14px">HISTORIAL DE COMPRAS</div>
    <div class="row"><span class="label">Cliente</span><span>${esc(customerName)}</span></div>
    <div class="row"><span class="label">Ventas</span><span>${history.length}</span></div>
    <div class="row"><span class="label">Total</span><span class="strong">${formatMoney(total, currency, locale)}</span></div>
    <div class="rule"></div>
    ${rows || '<div class="tiny">Sin compras registradas.</div>'}
    <div class="footer">Reporte de cliente · MAOBITS POS</div>
  `, `Historial-${customerName}`);
}

export function accountReportHtml(
  title: string,
  partyName: string,
  balance: number,
  entries: AccountReportEntry[],
  branding: TicketBranding,
  currency: Currency,
  locale: Locale,
) {
  const rows = entries.map((entry) => `
    <div class="item">
      <div class="row"><span class="itemName">${esc(entry.type)}</span><span class="strong">${formatMoney(entry.impact_minor, currency, locale)}</span></div>
      <div class="tiny">${esc(new Date(entry.created_at).toLocaleString())}${entry.note ? ` · ${esc(entry.note)}` : ''}</div>
    </div>
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="strong" style="text-align:center;font-size:14px">${esc(title)}</div>
    <div class="row"><span class="label">Nombre</span><span>${esc(partyName)}</span></div>
    <div class="row"><span class="grand">SALDO</span><span class="grand">${formatMoney(balance, currency, locale)}</span></div>
    <div class="rule"></div>
    ${rows || '<div class="tiny">Sin movimientos registrados.</div>'}
    <div class="footer">Cuenta corriente · MAOBITS POS</div>
  `, `${title}-${partyName}`);
}

export function generalReportHtml(
  title: string,
  subtitle: string,
  sections: GeneralReportSection[],
  branding: TicketBranding,
) {
  const content = sections.map((section) => `
    <div class="rule"></div>
    <div class="strong">${esc(section.title)}</div>
    ${section.rows.map((row) => `
      <div class="row"><span class="label">${esc(row.label)}</span><span class="strong">${esc(row.value)}</span></div>
    `).join('')}
  `).join('');

  return htmlDoc(`
    ${brandingHeader(branding)}
    <div class="strong" style="text-align:center;font-size:14px">${esc(title)}</div>
    <div class="tiny" style="text-align:center">${esc(subtitle)}</div>
    ${content}
    <div class="footer">Reporte general · MAOBITS POS</div>
  `, title);
}
