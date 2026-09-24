import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { SaleDetail } from '@/core/types';
import { salesService } from '@/modules/sales/service';
import { authService } from '@/modules/auth/service';
import { settingsService } from '@/modules/settings/service';
import { receiptHtml, printReceipt, shareReceipt } from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Empty, Input, ModalSheet, PageHeader, Screen, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [voidModal, setVoidModal] = useState(false);
  const [reason, setReason] = useState('');
  const [adminPin, setAdminPin] = useState('');

  async function load() {
    if (user && id) setSale(await salesService.detail(user.id, id));
  }

  useEffect(() => { void load(); }, [id, user?.id]);

  async function html() {
    if (!sale) return '';
    const branding = await settingsService.receiptBranding();
    return receiptHtml(sale, branding, currency, locale);
  }

  async function printSale() {
    try {
      await printReceipt(await html());
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function shareSale() {
    try {
      if (!sale) return;
      await shareReceipt(await html(), `MAOBITS-${sale.number}`);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed'));
    }
  }

  async function voidSale() {
    if (!user || !sale) return;
    try {
      let actorId = user.id;
      if (!has('SALES_VOID')) {
        const admin = await authService.authorizeAdministrator(adminPin);
        actorId = admin.id;
      }
      await salesService.void(actorId, sale.id, reason);
      setVoidModal(false);
      setReason('');
      setAdminPin('');
      await load();
    } catch (error) {
      Alert.alert('MAOBITS POS', error instanceof Error ? t(error.message) : t('errors.unknown'));
    }
  }

  if (!sale) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'sale' }} />
        <PageHeader title={t('sales.detail')} />
        <Empty />
      </Screen>
    );
  }

  const customerTitle = sale.customer_name ?? t('premiumExtra.checkpoint11.walkInCustomer');

  return (
    <Screen>
      <Stack.Screen options={{ title: `sale/${customerTitle}` }} />
      <PageHeader
        title={sale.number}
        subtitle={`${new Date(sale.created_at).toLocaleString()} · ${sale.user_name}`}
        eyebrow={t('premium.saleDetail.milestone12SaleDetail')}
        right={<Badge label={sale.status} tone={sale.status === 'VOID' ? 'danger' : 'success'} icon={sale.status === 'VOID' ? 'close-circle-outline' : 'checkmark-circle-outline'} />}
      />
      <Card variant="primary">
        <Text style={{ color: '#C7D2FE', fontSize: 12 }}>{t('premium.saleDetail.total')}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -1 }}>{formatMoney(sale.total, currency, locale)}</Text>
        <Text style={{ color: '#C7D2FE' }}>{customerTitle}</Text>
      </Card>
      <Card>
        <SectionTitle title={t('premium.saleDetail.products')} subtitle={`${sale.items.length} líneas`} />
        {sale.items.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: th.colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.colors.text, fontWeight: '800' }}>{item.quantity}× {item.product_name}</Text>
              <Text style={{ color: th.colors.subtle, fontSize: 11 }}>{formatMoney(item.unit_price, currency, locale)} c/u</Text>
            </View>
            <Text style={{ color: th.colors.heading, fontWeight: '900' }}>{formatMoney(item.total, currency, locale)}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle title={t('premium.saleDetail.settlement')} />
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('premium.saleDetail.subtotal')}</Text><Text style={{ color: th.colors.text, fontWeight: '800' }}>{formatMoney(sale.subtotal, currency, locale)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('pos.discount')}</Text><Text style={{ color: th.colors.text, fontWeight: '800' }}>{formatMoney(sale.discount, currency, locale)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.muted }}>{t('premium.saleDetail.taxes')}</Text><Text style={{ color: th.colors.text, fontWeight: '800' }}>{formatMoney(sale.tax, currency, locale)}</Text></View>
          <View style={{ height: 1, backgroundColor: th.colors.border }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: th.colors.heading, fontWeight: '900' }}>{t('premium.saleDetail.total')}</Text><Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 20 }}>{formatMoney(sale.total, currency, locale)}</Text></View>
        </View>
      </Card>
      <Card>
        <SectionTitle title={t('premium.saleDetail.payments')} />
        {sale.payments.map((payment) => (
          <View key={payment.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: th.colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={payment.method === 'CASH' ? 'cash-outline' : payment.method === 'CARD' ? 'card-outline' : 'swap-horizontal-outline'} size={18} color={th.colors.success} />
            </View>
            <Text style={{ color: th.colors.text, fontWeight: '800', flex: 1 }}>{t(`methods.${payment.method}`)}</Text>
            <Text style={{ color: th.colors.heading, fontWeight: '900' }}>{formatMoney(payment.amount, currency, locale)}</Text>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button icon="print-outline" label={t('sales.print')} onPress={printSale} />
        {sale.status === 'COMPLETED' ? (
          <Button variant="danger" icon={has('SALES_VOID') ? 'refresh-outline' : 'lock-closed-outline'} label={t('sales.void')} onPress={() => { setReason(''); setAdminPin(''); setVoidModal(true); }} />
        ) : null}
      </View>
      <ModalSheet visible={voidModal} title={t('sales.void')} onClose={() => setVoidModal(false)}>
        <Badge label={t('premium.saleDetail.theOriginalSaleIsPreservedAndReversal')} tone="warning" icon="warning-outline" />
        {!has('SALES_VOID') ? (
          <Card variant="warning">
            <SectionTitle title={t('premiumExtra.checkpoint11.adminOverride')} subtitle={t('premiumExtra.checkpoint11.adminOverrideHelp')} />
            <Input
              label={t('premiumExtra.checkpoint11.adminPin')}
              value={adminPin}
              onChangeText={(value) => setAdminPin(value.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </Card>
        ) : null}
        <Input label={t('sales.reason')} value={reason} onChangeText={setReason} />
        <Button fullWidth variant="danger" icon="refresh-outline" label={t('common.confirm')} disabled={!reason.trim() || (!has('SALES_VOID') && adminPin.length !== 4)} onPress={voidSale} />
      </ModalSheet>
    </Screen>
  );
}
