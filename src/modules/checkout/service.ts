import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import type { PaymentMethod } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';
import { allocateCheckout, settleCustomer, type LiveCheckoutLine } from './math';
export interface CheckoutPayment {
    method: PaymentMethod;
    amount: number;
    received?: number;
}
export interface CheckoutInput {
    actorId: string;
    customerId?: string | null;
    items: {
        productId: string;
        quantity: number;
    }[];
    orderDiscount: number;
    offerId?: string | null;
    requestedCredit: number;
    payments: CheckoutPayment[];
}
async function offerDiscountForCheckout(
    db: Awaited<ReturnType<typeof getDb>>,
    offerId: string | null | undefined,
    live: LiveCheckoutLine[],
  ) {
    if (!offerId) {
      return {
        offerId: null as string | null,
        offerName: null as string | null,
        discount: 0,
      };
    }

    const offer = await db.getFirstAsync<{
      id: string;
      name: string;
      active: number;
      printed_at: string | null;
      valid_from: string;
      valid_until: string;
    }>(
      `SELECT id,name,active,printed_at,valid_from,valid_until
       FROM catalog_offers WHERE id=?`,
      offerId,
    );

    const now = Date.now();
    if (
      !offer ||
      !offer.active ||
      !offer.printed_at ||
      new Date(offer.valid_from).getTime() > now ||
      new Date(offer.valid_until).getTime() < now
    ) {
      throw new AppError('errors.validation');
    }

    const ids = live.map((line) => line.productId);
    if (!ids.length) {
      return {
        offerId: offer.id,
        offerName: offer.name,
        discount: 0,
      };
    }

    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.getAllAsync<{
      product_id: string;
      offer_price: number;
    }>(
      `SELECT product_id,offer_price
       FROM catalog_offer_items
       WHERE offer_id=?
         AND product_id IN (${placeholders})`,
      offer.id,
      ...ids,
    );

    const prices = new Map(
      rows.map((row) => [row.product_id, row.offer_price]),
    );

    let discount = 0;
    for (const line of live) {
      const offerPrice = prices.get(line.productId);
      if (offerPrice === undefined) continue;

      discount +=
        Math.max(0, line.unitPrice - offerPrice) *
        line.quantity;
    }

    return {
      offerId: offer.id,
      offerName: offer.name,
      discount: Math.max(0, Math.round(discount)),
    };
  }

export const checkoutService = {
    async preview(input: {
        customerId?: string | null;
        total: number;
        requestedCredit: number;
        payment: number;
    }) { const db = await getDb(); let priorBalance = 0; if (input.customerId) {
        const r = await db.getFirstAsync<{
            b: number;
        }>('SELECT COALESCE(SUM(impact_minor),0) b FROM customer_account_entries WHERE customer_id=?', input.customerId);
        priorBalance = r?.b ?? 0;
    } return { priorBalance, ...settleCustomer(input.total, priorBalance, input.requestedCredit, input.payment) }; },
    async create(input: CheckoutInput) {
        await permissionService.require(input.actorId, 'POS_SELL');
        if (!input.items.length)
            throw new AppError('errors.validation');
        const saleId = uid('sal'), stamp = nowIso(), number = `V-${stamp.slice(0, 10).replace(/-/g, '')}-${saleId.slice(-6).toUpperCase()}`;
        return inTransaction(async (db) => {
            const live: LiveCheckoutLine[] = [];
            for (const req of input.items) {
                const p = await db.getFirstAsync<{
                    id: string;
                    name: string;
                    sale_price: number;
                    tax_rate_bp: number;
                    stock: number;
                    active: number;
                }>('SELECT id,name,sale_price,tax_rate_bp,stock,active FROM products WHERE id=?', req.productId);
                if (!p || !p.active || req.quantity <= 0 || req.quantity > p.stock)
                    throw new AppError('errors.stock');
                live.push({ productId: p.id, name: p.name, unitPrice: p.sale_price, taxRateBp: p.tax_rate_bp, quantity: req.quantity });
            }
            const offerQuote =
                await offerDiscountForCheckout(
                    db,
                    input.offerId,
                    live,
                );
            const gross = live.reduce(
                (sum, line) =>
                    sum + line.unitPrice * line.quantity,
                0,
            );
            const actualOfferDiscount = Math.min(
                gross,
                offerQuote.discount,
            );
            const manualDiscount = Math.min(
                Math.max(0, Math.round(input.orderDiscount)),
                Math.max(0, gross - actualOfferDiscount),
            );
            const math = allocateCheckout(
                live,
                actualOfferDiscount + manualDiscount,
            );
            let priorBalance = 0;
            if (input.customerId) {
                const b = await db.getFirstAsync<{
                    b: number;
                }>('SELECT COALESCE(SUM(impact_minor),0) b FROM customer_account_entries WHERE customer_id=?', input.customerId);
                priorBalance = b?.b ?? 0;
            }
            const requestedPayment = input.payments.reduce((s, p) => s + Math.max(0, Math.round(p.amount)), 0);
            const settlement = settleCustomer(math.total, priorBalance, input.requestedCredit, requestedPayment);
            if (settlement.newDebt > 0 && !input.customerId)
                throw new AppError('errors.customerCredit');
            if (requestedPayment > settlement.dueAfterCredit)
                throw new AppError('errors.validation');
            const hasCash = input.payments.some(p => p.method === 'CASH' && p.amount > 0);
            const cash = hasCash ? await db.getFirstAsync<{
                id: string;
            }>('SELECT id FROM cash_sessions WHERE status=\'OPEN\' LIMIT 1') : null;
            if (hasCash && !cash)
                throw new AppError('errors.cashRequired');
            await db.runAsync(`INSERT INTO sales(id,number,user_id,customer_id,cash_session_id,subtotal,discount,tax,total,applied_credit,paid_total,new_debt,status,created_at,offer_id,offer_name,offer_discount) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'COMPLETED',?,?,?,?)`, saleId, number, input.actorId, input.customerId ?? null, cash?.id ?? null, math.subtotal, math.discount, math.tax, math.total, settlement.appliedCredit, settlement.paid, settlement.newDebt, stamp, offerQuote.offerId, offerQuote.offerName, actualOfferDiscount);
            for (const line of math.lines) {
                const p = await db.getFirstAsync<{
                    stock: number;
                }>('SELECT stock FROM products WHERE id=?', line.productId);
                if (!p || p.stock < line.quantity)
                    throw new AppError('errors.stock');
                const after = p.stock - line.quantity;
                await db.runAsync(`INSERT INTO sale_items(id,sale_id,product_id,product_name,unit_price,quantity,discount,tax,total) VALUES(?,?,?,?,?,?,?,?,?)`, uid('sit'), saleId, line.productId, line.name, line.unitPrice, line.quantity, line.discount, line.tax, line.total);
                await db.runAsync('UPDATE products SET stock=?,updated_at=? WHERE id=?', after, stamp, line.productId);
                await db.runAsync(`INSERT INTO inventory_movements(id,product_id,type,quantity,before_stock,after_stock,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, uid('imv'), line.productId, 'SALE', -line.quantity, p.stock, after, 'SALE', saleId, null, input.actorId, stamp);
            }
            let paidRecorded = 0;
            for (const payment of input.payments) {
                const amount = Math.max(0, Math.round(payment.amount));
                if (!amount)
                    continue;
                paidRecorded += amount;
                const received = payment.method === 'CASH' ? Math.max(amount, Math.round(payment.received ?? amount)) : null;
                const change = received === null ? null : received - amount;
                await db.runAsync(`INSERT INTO payments(id,sale_id,method,amount,received,change_amount,created_at) VALUES(?,?,?,?,?,?,?)`, uid('pay'), saleId, payment.method, amount, received, change, stamp);
                if (payment.method === 'CASH' && cash)
                    await db.runAsync(`INSERT INTO cash_movements(id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, uid('cmv'), cash.id, input.actorId, 'SALE', amount, 'SALE', saleId, null, stamp);
            }
            if (paidRecorded !== settlement.paid)
                throw new AppError('errors.validation');
            if (input.customerId && settlement.appliedCredit > 0)
                await db.runAsync(`INSERT INTO customer_account_entries(id,customer_id,type,impact_minor,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, uid('cae'), input.customerId, 'CREDIT_USE', settlement.appliedCredit, 'SALE', saleId, 'Credit applied to sale', input.actorId, stamp);
            if (input.customerId && settlement.newDebt > 0)
                await db.runAsync(`INSERT INTO customer_account_entries(id,customer_id,type,impact_minor,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, uid('cae'), input.customerId, 'SALE_CREDIT', settlement.newDebt, 'SALE', saleId, 'Sale credit', input.actorId, stamp);
            return { saleId, number, ...math, priorBalance, ...settlement, offerDiscount: actualOfferDiscount, offerName: offerQuote.offerName };
        });
    },
};

