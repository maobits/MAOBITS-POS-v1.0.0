import * as Print from 'expo-print';
import type {
  Currency,
  Locale,
} from '@/core/types';
import { formatMoney } from '@/core/money';
import { readBase64 } from '@/core/media/files';
import { settingsService } from '@/modules/settings/service';
import { businessContactService } from '@/modules/settings/business-contact';
import { offerService } from './service';

function esc(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char] ?? char,
  );
}

function mime(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

async function imageSource(
  uri: string | null,
) {
  if (!uri) return null;

  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('data:')
  ) {
    return uri;
  }

  try {
    const base64 =
      await readBase64(uri);
    return (
      `data:${mime(uri)};base64,` +
      base64
    );
  } catch {
    return null;
  }
}

function discountText(bp: number) {
  const percent = bp / 100;
  return Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(2)}%`;
}

function dateLabel(
  value: string,
  locale: Locale,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    locale === 'es'
      ? 'es-CO'
      : 'en-US',
  );
}

function imageGridClass(
  count: number,
) {
  if (count <= 1) return 'single';
  if (count === 2) return 'two';
  if (count === 3) return 'three';
  if (count === 4) return 'four';
  return 'many';
}

export async function catalogHtml(
  actorId: string,
  offerId: string,
  locale: Locale,
) {
  const [
    { offer, items },
    branding,
    contact,
  ] = await Promise.all([
    offerService.previewForPrint(
      actorId,
      offerId,
    ),
    settingsService.receiptBranding(),
    businessContactService.get(),
  ]);

  const currency =
    offer.currency as Currency;

  const productOverrides =
    new Set(
      offer.productRules.map(
        (rule) => rule.product_id,
      ),
    );

  const enriched =
    await Promise.all(
      items.map(
        async (item) => {
          const imageUris =
            item.image_uris.length
              ? item.image_uris
              : item.image_uri
                ? [item.image_uri]
                : [];

          const images = (
            await Promise.all(
              imageUris.map(
                (uri) =>
                  imageSource(uri),
              ),
            )
          ).filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

          return {
            ...item,
            images,
            productPriority:
              productOverrides.has(
                item.product_id,
              ),
          };
        },
      ),
    );

  const logo =
    branding.logoDataUri
      ? `<img class="logo" src="${branding.logoDataUri}" />`
      : `<div class="logo-text">MAOBITS</div>`;

  const footerLogo =
    branding.logoDataUri
      ? `<img class="footer-logo" src="${branding.logoDataUri}" />`
      : `<div class="footer-logo-text">MAOBITS</div>`;

  const validity =
    locale === 'es'
      ? `Válido del ${dateLabel(
          offer.valid_from,
          locale,
        )} al ${dateLabel(
          offer.valid_until,
          locale,
        )}`
      : `Valid from ${dateLabel(
          offer.valid_from,
          locale,
        )} to ${dateLabel(
          offer.valid_until,
          locale,
        )}`;

  const emailLabel =
    locale === 'es'
      ? 'Email'
      : 'Email';

  const phoneLabel =
    locale === 'es'
      ? 'Teléfono'
      : 'Phone';

  const emailText =
    contact.email ||
    (locale === 'es'
      ? 'No configurado'
      : 'Not configured');

  const phoneText =
    contact.phone ||
    (locale === 'es'
      ? 'No configurado'
      : 'Not configured');


  const labels =
    locale === 'es'
      ? {
          before: 'Precio antes',
          after: 'Precio después',
          category:
            'Descuento de categoría',
          product:
            'Descuento específico de producto',
          priority:
            'El descuento específico del producto tiene prioridad sobre el descuento de la categoría.',
          terms:
            'Condiciones de la oferta',
          page:
            'Producto',
          of: 'de',
          availability:
            'Precio y disponibilidad correspondientes a esta versión del catálogo.',
        }
      : {
          before: 'Price before',
          after: 'Price after',
          category:
            'Category discount',
          product:
            'Product-specific discount',
          priority:
            'The product-specific discount takes priority over the category discount.',
          terms: 'Offer terms',
          page: 'Product',
          of: 'of',
          availability:
            'Price and availability correspond to this catalog version.',
        };

  const pages =
    enriched
      .map(
        (product, index) => {
          const sourceLabel =
            product.productPriority
              ? labels.product
              : labels.category;

          const discount =
            discountText(
              product.discount_bp,
            );

          return `
<section class="product-page">
  <header class="hero">
    <div class="brand">
      ${logo}
      <div class="brand-copy">
        <div class="business">
          ${esc(branding.businessName)}
        </div>
        <div class="app">
          MAOBITS POS · ${esc(offer.name)}
        </div>
      </div>
    </div>

    <div class="hero-row">
      <div>
        <div class="category-pill">
          ${esc(
            product.category_name ||
            (
              locale === 'es'
                ? 'Producto'
                : 'Product'
            ),
          )}
        </div>
        <h1>
          ${esc(
            product.product_name,
          )}
        </h1>
        ${
          offer.subtitle
            ? `<div class="subtitle">${esc(
                offer.subtitle,
              )}</div>`
            : ''
        }
      </div>

      <div class="page-index">
        ${labels.page}
        ${index + 1}
        ${labels.of}
        ${enriched.length}
      </div>
    </div>

    <div class="validity">
      ${esc(validity)}
    </div>
  </header>

  <main class="content">
    <div class="image-panel">
      ${
        product.images.length
          ? `<div class="image-grid ${imageGridClass(
              product.images.length,
            )}">
              ${product.images
                .map(
                  (image) =>
                    `<div class="image-cell">
                      <img src="${image}" />
                    </div>`,
                )
                .join('')}
            </div>`
          : `<div class="image-empty">
              <div class="image-empty-mark">MAOBITS</div>
              <div>POS</div>
            </div>`
      }

      ${
        product.discount_bp > 0
          ? `<div class="discount-badge">
              -${esc(discount)}
            </div>`
          : ''
      }
    </div>

    <div class="product-info">
      ${
        product.description
          ? `<p class="description">
              ${esc(product.description)}
            </p>`
          : ''
      }

      <div class="price-grid">
        <div class="price-card before-card">
          <div class="price-label">
            ${labels.before}
          </div>
          <div class="price-before">
            ${esc(
              formatMoney(
                product.base_price,
                currency,
                locale,
              ),
            )}
          </div>
        </div>

        <div class="price-card after-card">
          <div class="price-label after-label">
            ${labels.after}
          </div>
          <div class="price-after">
            ${esc(
              formatMoney(
                product.offer_price,
                currency,
                locale,
              ),
            )}
          </div>
        </div>
      </div>

      <div class="rule-box">
        <div class="rule-title">
          ${esc(sourceLabel)}
          · ${esc(discount)}
        </div>
        <div class="rule-help">
          ${esc(labels.priority)}
        </div>
      </div>

      ${
        offer.notes
          ? `<div class="notes">
              <strong>
                ${labels.terms}:
              </strong>
              ${esc(offer.notes)}
            </div>`
          : ''
      }
    </div>
  </main>

  <footer class="footer">
    <div class="footer-main">
      <span>
        ${esc(labels.availability)}
      </span>
      <span>
        ${esc(validity)}
      </span>
    </div>

    <div class="business-contact">
      <div class="footer-brand">
        ${footerLogo}
      </div>

      <div class="business-contact-details">
        <strong>
          ${esc(branding.businessName)}
        </strong>

        <span>
          ${esc(emailLabel)}:
          ${esc(emailText)}
        </span>

        <span>
          ${esc(phoneLabel)}:
          ${esc(phoneText)}
        </span>
      </div>
    </div>
  </footer>
</section>`;
        },
      )
      .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    color: #111827;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Arial,
      sans-serif;
    background: #ffffff;
  }

  .product-page {
    width: 210mm;
    height: 297mm;
    padding: 10mm 12mm 8mm;
    overflow: hidden;
    background: #ffffff;
    break-after: page;
    page-break-after: always;
    display: flex;
    flex-direction: column;
  }

  .product-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .hero {
    padding: 9mm 10mm;
    border-radius: 18px;
    color: #ffffff;
    background:
      linear-gradient(
        135deg,
        #312e81,
        #4f46e5 55%,
        #7c3aed
      );
    position: relative;
    overflow: hidden;
  }

  .hero:after {
    content: "";
    position: absolute;
    width: 90mm;
    height: 90mm;
    border-radius: 50%;
    background:
      rgba(255,255,255,.08);
    right: -28mm;
    top: -42mm;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 6mm;
    margin-bottom: 6mm;
    position: relative;
    z-index: 2;
  }

  .logo {
    width: 27mm;
    height: 14mm;
    object-fit: contain;
    background: #ffffff;
    border-radius: 8px;
    padding: 1.5mm;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 1000;
    letter-spacing: 2px;
  }

  .business {
    font-weight: 950;
    font-size: 16px;
  }

  .app {
    margin-top: 1mm;
    color: #c7d2fe;
    font-size: 9px;
  }

  .hero-row {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 7mm;
    align-items: flex-start;
    justify-content: space-between;
  }

  .category-pill {
    display: inline-block;
    border-radius: 99px;
    padding: 2mm 4mm;
    background:
      rgba(255,255,255,.15);
    border:
      1px solid rgba(255,255,255,.28);
    font-size: 9px;
    font-weight: 850;
    margin-bottom: 3mm;
  }

  h1 {
    margin: 0;
    max-width: 145mm;
    font-size: 27px;
    line-height: 1.05;
  }

  .subtitle {
    margin-top: 2.5mm;
    color: #e0e7ff;
    font-size: 11px;
    max-width: 145mm;
  }

  .page-index {
    min-width: 25mm;
    text-align: right;
    color: #c7d2fe;
    font-size: 8px;
    font-weight: 800;
  }

  .validity {
    display: inline-block;
    position: relative;
    z-index: 2;
    margin-top: 5mm;
    border:
      1px solid rgba(255,255,255,.32);
    background:
      rgba(255,255,255,.12);
    border-radius: 99px;
    padding: 2mm 4mm;
    font-size: 9px;
    font-weight: 850;
  }

  .content {
    flex: 1;
    display: grid;
    grid-template-columns:
      105mm 1fr;
    gap: 8mm;
    align-items: stretch;
    padding-top: 7mm;
    min-height: 0;
  }

  .image-panel {
    position: relative;
    border-radius: 18px;
    border: 1px solid #e5e7eb;
    background:
      linear-gradient(
        180deg,
        #f8fafc,
        #eef2ff
      );
    overflow: hidden;
    min-height: 166mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-grid {
    width: 100%;
    height: 100%;
    padding: 3mm;
    display: grid;
    gap: 3mm;
    min-height: 0;
  }

  .image-grid.single {
    grid-template-columns: 1fr;
  }

  .image-grid.two {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .image-grid.three,
  .image-grid.four {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    grid-template-rows:
      repeat(2, minmax(0, 1fr));
  }

  .image-grid.three
  .image-cell:first-child {
    grid-column: 1 / -1;
  }

  .image-grid.many {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    grid-auto-rows:
      minmax(0, 1fr);
  }

  .image-cell {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-cell img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 2mm;
  }

  .image-empty {
    color: #94a3b8;
    text-align: center;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .image-empty-mark {
    font-size: 27px;
    color: #4f46e5;
    margin-bottom: 2mm;
  }

  .discount-badge {
    position: absolute;
    top: 5mm;
    right: 5mm;
    color: #ffffff;
    background: #dc2626;
    border-radius: 99px;
    padding: 3mm 4mm;
    font-size: 14px;
    font-weight: 1000;
    box-shadow:
      0 3mm 8mm rgba(220,38,38,.22);
  }

  .product-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5mm;
  }

  .description {
    margin: 0;
    color: #475569;
    font-size: 11px;
    line-height: 1.55;
  }

  .price-grid {
    display: grid;
    grid-template-columns:
      1fr;
    gap: 4mm;
  }

  .price-card {
    border-radius: 14px;
    padding: 5mm;
    border: 1px solid #e5e7eb;
  }

  .before-card {
    background: #f8fafc;
  }

  .after-card {
    background: #eef2ff;
    border-color: #c7d2fe;
  }

  .price-label {
    color: #64748b;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .3px;
  }

  .after-label {
    color: #4338ca;
  }

  .price-before {
    color: #475569;
    margin-top: 2mm;
    font-size: 17px;
    font-weight: 900;
    text-decoration: line-through;
    text-decoration-color: #94a3b8;
  }

  .price-after {
    color: #4338ca;
    margin-top: 2mm;
    font-size: 25px;
    font-weight: 1000;
    line-height: 1;
  }

  .rule-box {
    border-radius: 13px;
    padding: 4mm;
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
  }

  .rule-title {
    color: #4338ca;
    font-size: 10px;
    font-weight: 950;
  }

  .rule-help {
    margin-top: 2mm;
    color: #6b7280;
    font-size: 8.5px;
    line-height: 1.45;
  }

  .notes {
    border-radius: 12px;
    padding: 4mm;
    color: #374151;
    background: #fffbeb;
    border: 1px solid #fde68a;
    font-size: 8.5px;
    line-height: 1.45;
  }

  .footer {
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px solid #e5e7eb;
    color: #64748b;
    font-size: 7.5px;
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }

  .footer-main {
    display: flex;
    gap: 5mm;
    justify-content: space-between;
  }

  .business-contact {
    display: flex;
    gap: 3mm;
    align-items: center;
    color: #334155;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    padding: 2.5mm 3mm;
  }

  .footer-brand {
    width: 21mm;
    min-width: 21mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .footer-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .footer-logo-text {
    color: #4f46e5;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: 1px;
  }

  .business-contact-details {
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: .7mm;
    font-size: 7.5px;
  }

  .business-contact strong {
    color: #111827;
    font-size: 8.5px;
  }
</style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

export const catalogPrintService = {
  async print(
    actorId: string,
    offerId: string,
    locale: Locale,
  ) {
    const preview =
      await offerService.previewForPrint(
        actorId,
        offerId,
      );

    const html =
      await catalogHtml(
        actorId,
        offerId,
        locale,
      );

    await offerService.recordPrinted(
      actorId,
      offerId,
      preview.items,
    );

    await Print.printAsync({ html });

    return offerId;
  },
};
