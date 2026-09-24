import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { checkoutService } from '@/modules/checkout/service';
import { offerService } from '@/modules/offers/service';
import { customerService } from '@/modules/customers/service';
import type { Customer, Page, PaymentMethod } from '@/core/types';
import { calculateCart, formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { useCartStore } from '@/stores/cart';
import { usePreferencesStore } from '@/stores/preferences';
import { useSessionStore } from '@/stores/session';
import { Badge, Button, Card, Empty, Input, ModalSheet, MoneyField, PageHeader, Pager, Screen, SearchBar, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Checkout() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const items = useCartStore((s) => s.items);
  const orderDiscount = useCartStore((s) => s.orderDiscount);
  const appliedOfferId = useCartStore((s) => s.appliedOfferId);
  const appliedOfferName = useCartStore((s) => s.appliedOfferName);
  const applyOffer = useCartStore((s) => s.applyOffer);
  const clearOffer = useCartStore((s) => s.clearOffer);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clear = useCartStore((s) => s.clear);
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [checkoutOffersOpen, setCheckoutOffersOpen] = useState(false);
  const [checkoutOffers, setCheckoutOffers] = useState<Awaited<ReturnType<typeof offerService.activeForPos>>>([]);
  const [checkoutOffersLoading, setCheckoutOffersLoading] = useState(false);
  const math = useMemo(() => calculateCart(items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, taxRateBp: i.taxRateBp })), orderDiscount + offerDiscount), [items, orderDiscount, offerDiscount]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Page<Customer> | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerDocument, setNewCustomerDocument] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [requestedCredit, setRequestedCredit] = useState(0);
  const [payment, setPayment] = useState(math.total);
  const [received, setReceived] = useState(math.total);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [settlement, setSettlement] = useState({ priorBalance: 0, creditAvailable: 0, appliedCredit: 0, dueAfterCredit: math.total, paid: math.total, newDebt: 0, finalBalance: 0 });
  const [busy, setBusy] = useState(false);
  const tendered = method === 'CASH' ? received : payment;

  async function openCheckoutOffers() {
    if (!user) return;

    try {
      setCheckoutOffersLoading(true);

      const offers =
        await offerService.activeForPos(
          user.id,
          currency,
        );

      setCheckoutOffers(offers);
      setCheckoutOffersOpen(true);
    } catch (error) {
      setCheckoutOffers([]);

      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t(
              'premiumExtra.checkpoint22.offerLoadFailed',
            ),
      );
    } finally {
      setCheckoutOffersLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !appliedOfferId || !items.length) {
      setOfferDiscount(0);
      return;
    }

    void offerService
      .quote(
        user.id,
        appliedOfferId,
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      )
      .then((quote) => setOfferDiscount(quote.discount))
      .catch(() => setOfferDiscount(0));
  }, [user?.id, appliedOfferId, items]);

  useEffect(() => {
    void checkoutService.preview({ customerId: customer?.id, total: math.total, requestedCredit, payment: tendered }).then(setSettlement);
  }, [customer?.id, math.total, requestedCredit, tendered]);

  async function loadCustomers(search = customerSearch, page = customerPage) {
    setCustomers(await customerService.page(search, page, 8));
  }

  async function openCustomers() {
    setCustomerFormOpen(false);
    setCustomerSearch('');
    setCustomerPage(1);
    setCustomerModal(true);
    setCustomers(await customerService.page('', 1, 8));
  }
  async function createCustomer() {
    if (!user || !newCustomerName.trim() || !newCustomerDocument.trim() || !newCustomerPhone.trim()) return;
    try {
      const id = await customerService.create(user.id, {
        name: newCustomerName,
        document: newCustomerDocument,
        phone: newCustomerPhone,
      });
      const c = await customerService.get(id); if (c) setCustomer(c);
      setNewCustomerName(''); setNewCustomerDocument(''); setNewCustomerPhone(''); setCustomerFormOpen(false); setCustomerModal(false);
    } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); }
  }
  async function finish() {
    if (!user) return;
    try {
      setBusy(true);
      const result = await checkoutService.create({
        actorId: user.id,
        customerId: customer?.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        orderDiscount,
        offerId: appliedOfferId,
        requestedCredit,
        payments: settlement.paid > 0 ? [{ method, amount: settlement.paid, received: method === 'CASH' ? received : undefined }] : [],
      });
      clear();
      Alert.alert('MAOBITS POS', `${result.number}`, [{ text: 'OK', onPress: () => router.replace('/(tabs)/pos') }]);
    } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); }
    finally { setBusy(false); }
  }

  const paymentMethods: { method: PaymentMethod; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { method: 'CASH', label: t('methods.CASH'), icon: 'cash-outline' },
    { method: 'CARD', label: t('methods.CARD'), icon: 'card-outline' },
    { method: 'TRANSFER', label: t('methods.TRANSFER'), icon: 'swap-horizontal-outline' },
    { method: 'OTHER', label: t('methods.OTHER'), icon: 'ellipsis-horizontal-circle-outline' },
  ];

  if (!items.length) return <Screen><PageHeader title={t('checkout.title')} subtitle={t('premium.checkout.noPendingProducts')} /><Empty label={t('pos.emptyCart')} icon="cart-outline" /><Button variant="ghost" icon="arrow-back" label={t('premium.checkout.backToPos')} onPress={() => router.replace('/(tabs)/pos')} /></Screen>;

  return (
    <Screen>
      <PageHeader title={t('checkout.title')} subtitle={t('premium.checkout.salePaymentInventoryCashAndCustomerAccount')} eyebrow={t('premium.checkout.milestone10AtomicCheckout')} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, width: '100%', gap: 14 }}>
          <Card>
            <SectionTitle title={t('premium.checkout.saleSummary')} subtitle={t('premiumExtra.checkout.cartLines', { count: items.length })} />
            {items.map((i) => <View key={i.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: th.colors.border }}><Text style={{ color: th.colors.text, flex: 1 }}>{i.quantity}× {i.name}</Text><Text style={{ color: th.colors.text, fontWeight: '900' }}>{formatMoney(i.unitPrice * i.quantity, currency, locale)}</Text></View>)}
            <MoneyField label={t('pos.discount')} value={orderDiscount} onChangeMinor={setDiscount} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}><Text style={{ color: th.colors.muted, fontWeight: '800' }}>{t('checkout.saleTotal')}</Text><Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 24 }}>{formatMoney(math.total, currency, locale)}</Text></View>
          </Card>

          <Card>
            <SectionTitle title={t('checkout.customer')} subtitle={t('premium.checkout.previousDebtDoesNotChangeTheAccounting')} />
            <Button fullWidth variant="ghost" icon="person-outline" label={customer?.name ?? t('checkout.selectCustomer')} onPress={openCustomers} />
            {customer ? <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Card variant="soft" style={{ flex: 1, minWidth: 150 }}><Text style={{ color: th.colors.muted, fontSize: 11 }}>{t('checkout.priorBalance')}</Text><Text style={{ color: settlement.priorBalance > 0 ? th.colors.danger : th.colors.success, fontWeight: '900', fontSize: 20 }}>{formatMoney(settlement.priorBalance, currency, locale)}</Text></Card>
                <Card variant="soft" style={{ flex: 1, minWidth: 150 }}><Text style={{ color: th.colors.muted, fontSize: 11 }}>{t('checkout.creditAvailable')}</Text><Text style={{ color: th.colors.success, fontWeight: '900', fontSize: 20 }}>{formatMoney(settlement.creditAvailable, currency, locale)}</Text></Card>
              </View>
              <MoneyField label={t('checkout.applyCredit')} value={requestedCredit} onChangeMinor={setRequestedCredit} />
            </> : <Badge label={t('premium.checkout.customerIsOptionalForARegularSale')} tone="neutral" icon="information-circle-outline" />}
          </Card>
        </View>

        <Card style={{ flex: wide ? 0.82 : undefined, width: '100%' }}>
                    <Card variant="soft">
            <SectionTitle
              title={t(
                'premiumExtra.checkpoint20.discountOffers',
              )}
              subtitle={
                appliedOfferId
                  ? appliedOfferName ?? undefined
                  : t(
                      'premiumExtra.checkpoint20.discountOffersHelp',
                    )
              }
              right={
                <Button
                  compact
                  variant="secondary"
                  icon="pricetag-outline"
                  label={t(
                    'premiumExtra.checkpoint20.chooseOffer',
                  )}
                  disabled={checkoutOffersLoading}
                  onPress={() =>
                    void openCheckoutOffers()
                  }
                />
              }
            />

            {appliedOfferId ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      color: th.colors.muted,
                    }}
                  >
                    {t(
                      'premiumExtra.checkpoint18.offerDiscount',
                    )}
                  </Text>
                  <Text
                    style={{
                      color: th.colors.success,
                      fontWeight: '900',
                    }}
                  >
                    -{formatMoney(
                      offerDiscount,
                      currency,
                      locale,
                    )}
                  </Text>
                </View>

                <Badge
                  label={t(
                    'premiumExtra.checkpoint20.offerRevalidated',
                  )}
                  tone="info"
                  icon="shield-checkmark-outline"
                />

                <Button
                  compact
                  variant="ghost"
                  icon="close-circle-outline"
                  label={t(
                    'premiumExtra.checkpoint18.removeOffer',
                  )}
                  onPress={() =>
                    clearOffer()
                  }
                />
              </>
            ) : (
              <Text
                style={{
                  color: th.colors.muted,
                  lineHeight: 18,
                }}
              >
                {t(
                  'premiumExtra.checkpoint20.noOfferApplied',
                )}
              </Text>
            )}
          </Card>

<SectionTitle title={t('checkout.method')} subtitle={t('premium.checkout.chooseHowThePaymentIsRecorded')} />
          <View style={{ gap: 8 }}>{paymentMethods.map((m) => {
            const active = method === m.method;
            return <Button key={m.method} fullWidth icon={m.icon} label={m.label} variant={active ? 'secondary' : 'ghost'} onPress={() => setMethod(m.method)} />;
          })}</View>
          {method === 'CASH' ? <MoneyField label={t('checkout.received')} value={received} onChangeMinor={setReceived} /> : <MoneyField label={t('checkout.payment')} value={payment} onChangeMinor={setPayment} />}

          <Card variant="soft">
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('premium.checkout.afterCreditBalance')}</Text><Text style={{ color: th.colors.text, fontWeight: '900' }}>{formatMoney(settlement.dueAfterCredit, currency, locale)}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('checkout.payment')}</Text><Text style={{ color: th.colors.success, fontWeight: '900' }}>{formatMoney(settlement.paid, currency, locale)}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('checkout.newDebt')}</Text><Text style={{ color: settlement.newDebt > 0 ? th.colors.danger : th.colors.text, fontWeight: '900' }}>{formatMoney(settlement.newDebt, currency, locale)}</Text></View>
              <View style={{ height: 1, backgroundColor: th.colors.border }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.text, fontWeight: '900' }}>{t('checkout.finalBalance')}</Text><Text style={{ color: settlement.finalBalance > 0 ? th.colors.danger : settlement.finalBalance < 0 ? th.colors.success : th.colors.heading, fontWeight: '900', fontSize: 18 }}>{formatMoney(settlement.finalBalance, currency, locale)}</Text></View>
              {method === 'CASH' ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('checkout.change')}</Text><Text style={{ color: th.colors.primary, fontWeight: '900' }}>{formatMoney(Math.max(0, received - settlement.paid), currency, locale)}</Text></View> : null}
            </View>
          </Card>

          {settlement.newDebt > 0 && !customer ? <Badge label={t('checkout.customerRequired')} tone="danger" icon="alert-circle-outline" /> : null}
          <Button fullWidth icon="checkmark-circle-outline" label={t('checkout.finish')} disabled={busy || !items.length || (settlement.newDebt > 0 && !customer)} onPress={finish} />
          <Badge label={t('premium.checkout.beginSaleItemsPaymentsInventoryCashAccount')} tone="info" icon="git-branch-outline" />
        </Card>
      </View>

      <ModalSheet
        visible={customerModal}
        title={t('checkout.selectCustomer')}
        onClose={() => setCustomerModal(false)}
      >
        {!customerFormOpen ? (
          <>
            <SearchBar
              placeholder={t('premiumExtra.checkpoint12.searchCustomer')}
              value={customerSearch}
              onChangeText={(value) => {
                setCustomerSearch(value);
                setCustomerPage(1);
                void customerService.page(value, 1, 8).then(setCustomers);
              }}
            />

            {customers?.items.length ? (
              customers.items.map((item) => (
                <Button
                  key={item.id}
                  fullWidth
                  icon="person-outline"
                  label={`${item.name}${item.document ? ` · ${item.document}` : ''}${item.phone ? ` · ${item.phone}` : ''}`}
                  variant={customer?.id === item.id ? 'secondary' : 'ghost'}
                  onPress={() => {
                    setCustomer(item);
                    setCustomerModal(false);
                  }}
                />
              ))
            ) : (
              <Empty
                label={t('premiumExtra.checkpoint12.noCustomers')}
                icon="people-outline"
              />
            )}

            {customers ? (
              <Pager
                page={customers.page}
                pages={customers.pages}
                onChange={(next) => {
                  setCustomerPage(next);
                  void customerService
                    .page(customerSearch, next, 8)
                    .then(setCustomers);
                }}
              />
            ) : null}

            {has('CUSTOMERS_EDIT') ? (
              <Button
                fullWidth
                variant="secondary"
                icon="person-add-outline"
                label={t('customers.new')}
                onPress={() => setCustomerFormOpen(true)}
              />
            ) : null}
          </>
        ) : (
          <Card variant="soft">
            <SectionTitle
              title={t('checkout.createCustomer')}
              subtitle={t('premiumExtra.checkpoint11.quickCustomerHelp')}
              right={
                <Button
                  compact
                  variant="ghost"
                  icon="arrow-back"
                  label={t('common.previous')}
                  onPress={() => setCustomerFormOpen(false)}
                />
              }
            />
            <Input
              label={t('common.name')}
              icon="person-add-outline"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />
            <Input
              label={t('common.document')}
              icon="card-outline"
              value={newCustomerDocument}
              onChangeText={setNewCustomerDocument}
            />
            <Input
              label={t('common.phone')}
              icon="call-outline"
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              keyboardType="phone-pad"
            />
            <Button
              fullWidth
              icon="person-add-outline"
              label={t('checkout.createCustomer')}
              disabled={
                !newCustomerName.trim() ||
                !newCustomerDocument.trim() ||
                !newCustomerPhone.trim()
              }
              onPress={createCustomer}
            />
          </Card>
        )}
      </ModalSheet>
      <ModalSheet
        visible={checkoutOffersOpen}
        title={t(
          'premiumExtra.checkpoint20.currentOffers',
        )}
        onClose={() =>
          setCheckoutOffersOpen(false)
        }
      >
        {checkoutOffersLoading ? (
          <Badge
            label={t(
              'premiumExtra.checkpoint22.loadingOffers',
            )}
            tone="info"
            icon="refresh-outline"
          />
        ) : checkoutOffers.length ? (
          checkoutOffers.map((offer) => (
            <Card
              key={offer.id}
              variant={
                appliedOfferId === offer.id
                  ? 'primary'
                  : 'soft'
              }
            >
              <SectionTitle
                title={offer.name}
                subtitle={`${t(
                  'premiumExtra.checkpoint18.expires',
                )} ${new Date(
                  offer.valid_until,
                ).toLocaleDateString()}`}
              />

              {offer.notes ? (
                <Text
                  style={{
                    color:
                      appliedOfferId === offer.id
                        ? '#E0E7FF'
                        : th.colors.muted,
                    lineHeight: 18,
                  }}
                >
                  {offer.notes}
                </Text>
              ) : null}

              {offer.categoryRules
                .filter(
                  (rule) =>
                    rule.discount_bp > 0,
                )
                .map((rule) => (
                  <Badge
                    key={`c-${rule.category_id}`}
                    label={`${rule.category_name} · -${
                      rule.discount_bp / 100
                    }%`}
                    tone="info"
                    icon="folder-outline"
                  />
                ))}

              {offer.productRules
                .filter(
                  (rule) =>
                    rule.discount_bp > 0,
                )
                .map((rule) => (
                  <Badge
                    key={`p-${rule.product_id}`}
                    label={`${rule.product_name} · -${
                      rule.discount_bp / 100
                    }%`}
                    tone="success"
                    icon="flash-outline"
                  />
                ))}

              <Button
                fullWidth
                variant={
                  appliedOfferId === offer.id
                    ? 'secondary'
                    : 'primary'
                }
                icon="pricetag-outline"
                label={t(
                  'premiumExtra.checkpoint20.applyThisOffer',
                )}
                onPress={() => {
                  applyOffer(
                    offer.id,
                    offer.name,
                  );
                  setCheckoutOffersOpen(
                    false,
                  );
                }}
              />
            </Card>
          ))
        ) : (
          <Empty
            label={t(
              'premiumExtra.checkpoint20.noCurrentOffers',
            )}
            icon="pricetag-outline"
          />
        )}
      </ModalSheet>

    </Screen>
  );
}
