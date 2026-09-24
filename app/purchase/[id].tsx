import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { PurchaseDetail } from '@/modules/purchases/repository';
import { purchaseService } from '@/modules/purchases/service';
import { settingsService } from '@/modules/settings/service';
import {
  purchaseReceiptHtml,
  printReceipt,
  shareReceipt,
} from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  Empty,
  PageHeader,
  Screen,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);

  useEffect(() => {
    if (user && id) {
      void purchaseService.detail(user.id, id).then(setPurchase);
    }
  }, [user?.id, id]);

  async function html() {
    if (!purchase) return '';
    const branding = await settingsService.receiptBranding();
    return purchaseReceiptHtml(purchase, branding, currency, locale);
  }

  async function print() {
    try {
      await printReceipt(await html());
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function share() {
    try {
      if (!purchase) return;
      await shareReceipt(await html(), `MAOBITS-${purchase.number}`);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed'));
    }
  }

  if (!purchase) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('premiumExtra.checkpoint12.purchase') }} />
        <PageHeader title={t('premiumExtra.checkpoint12.purchase')} />
        <Empty />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `purchase/${purchase.supplier_name}` }} />

      <PageHeader
        title={purchase.number}
        subtitle={`${purchase.supplier_name} · ${new Date(
          purchase.created_at,
        ).toLocaleString()}`}
        eyebrow={t('premiumExtra.checkpoint12.purchaseDetail')}
      />

      <Card variant="primary">
        <Text style={{ color: '#C7D2FE', fontSize: 12 }}>
          {t('pos.total')}
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: 34,
          }}
        >
          {has('PRODUCT_COST_VIEW')
            ? formatMoney(purchase.total, currency, locale)
            : t('premiumExtra.checkpoint12.costProtected')}
        </Text>
        <Text style={{ color: '#C7D2FE' }}>
          {purchase.supplier_name}
        </Text>
      </Card>

      <Card>
        <SectionTitle title={t('premiumExtra.checkpoint12.purchaseItems')} />
        {purchase.items.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: th.colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: th.colors.text, fontWeight: '800' }}
              >
                {item.quantity}× {item.product_name}
              </Text>
              <Text style={{ color: th.colors.subtle, fontSize: 11 }}>
                {has('PRODUCT_COST_VIEW')
                  ? `${formatMoney(item.unit_cost, currency, locale)} c/u`
                  : t('premiumExtra.checkpoint12.costProtected')}
              </Text>
            </View>
            <Text
              style={{ color: th.colors.heading, fontWeight: '900' }}
            >
              {has('PRODUCT_COST_VIEW')
                ? formatMoney(item.total, currency, locale)
                : '—'}
            </Text>
          </View>
        ))}
      </Card>

      {has('PRODUCT_COST_VIEW') ? (
        <>
          <Card variant="soft">
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: th.colors.muted }}>
                  {t('checkout.payment')}
                </Text>
                <Text style={{ color: th.colors.success, fontWeight: '900' }}>
                  {formatMoney(purchase.payment_total, currency, locale)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: th.colors.muted }}>
                  {t('premiumExtra.checkpoint12.supplierBalance')}
                </Text>
                <Text
                  style={{
                    color:
                      purchase.supplier_balance > 0
                        ? th.colors.danger
                        : purchase.supplier_balance < 0
                          ? th.colors.success
                          : th.colors.heading,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(purchase.supplier_balance, currency, locale)}
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon="print-outline"
              label={t('sales.print')}
              onPress={print}
            />
          </View>
        </>
      ) : (
        <Badge
          label={t('premiumExtra.checkpoint12.purchaseFinancialProtected')}
          tone="warning"
          icon="lock-closed-outline"
        />
      )}
    </Screen>
  );
}
