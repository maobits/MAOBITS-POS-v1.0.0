import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import type { Page } from '@/core/types';
import type { PurchaseSummary } from '@/modules/purchases/repository';
import { purchaseService } from '@/modules/purchases/service';
import { supplierService } from '@/modules/suppliers/service';
import type { Supplier } from '@/core/types';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  DatePickerField,
  Empty,
  Input,
  ModalSheet,
  PageHeader,
  Pager,
  Screen,
  SearchBar,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function PurchasesScreen() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [data, setData] = useState<Page<PurchaseSummary> | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [filters, setFilters] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    void purchaseService.page(
      user.id,
      search,
      page,
      10,
      supplierId,
      from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    ).then(setData);
    if (has('SUPPLIERS_VIEW')) {
      void supplierService.page(user.id, '', 1, 100, false).then((p) => setSuppliers(p.items));
    }
  }, [user?.id, search, page, supplierId, from, to, has]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  return (
    <Screen>
      <PageHeader
        title={t('premiumExtra.checkpoint12.purchasesTitle')}
        subtitle={t('premiumExtra.checkpoint12.purchasesSubtitle')}
        eyebrow={t('premiumExtra.checkpoint12.purchasesEyebrow')}
        right={
          has('INVENTORY_PURCHASE') ? (
            <Button
              compact
              icon="bag-add-outline"
              label={t('inventory.purchase')}
              onPress={() => router.push('/purchase-form' as Href)}
            />
          ) : undefined
        }
      />

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <SearchBar
            placeholder={t('premiumExtra.checkpoint12.searchPurchase')}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
        </View>
        <Button
          compact
          variant="secondary"
          icon="options-outline"
          label={t('premiumExtra.checkpoint11.reportFilters')}
          onPress={() => setFilters(true)}
        />
      </View>

      {data?.items.length ? (
        data.items.map((purchase) => (
          <Card
            key={purchase.id}
            onPress={() =>
              router.push(`/purchase/${purchase.id}` as Href)
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  backgroundColor: th.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="bag-handle-outline"
                  size={23}
                  color={th.colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: th.colors.heading,
                    fontWeight: '900',
                    fontSize: 15,
                  }}
                >
                  {purchase.number}
                </Text>
                <Text
                  style={{
                    color: th.colors.muted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {purchase.supplier_name} ·{' '}
                  {new Date(purchase.created_at).toLocaleString()}
                </Text>
              </View>

              {has('PRODUCT_COST_VIEW') ? (
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text
                    style={{
                      color: th.colors.heading,
                      fontWeight: '900',
                      fontSize: 17,
                    }}
                  >
                    {formatMoney(purchase.total, currency, locale)}
                  </Text>
                  {purchase.payment_total > 0 ? (
                    <Badge
                      label={`${t('checkout.payment')}: ${formatMoney(
                        purchase.payment_total,
                        currency,
                        locale,
                      )}`}
                      tone="success"
                    />
                  ) : (
                    <Badge
                      label={t('premiumExtra.checkpoint12.accountPurchase')}
                      tone="warning"
                    />
                  )}
                </View>
              ) : (
                <Badge
                  label={t('premiumExtra.checkpoint12.costProtected')}
                  tone="warning"
                  icon="lock-closed-outline"
                />
              )}
            </View>
          </Card>
        ))
      ) : (
        <Empty
          label={t('premiumExtra.checkpoint12.noPurchases')}
          icon="bag-handle-outline"
        />
      )}

      {data ? (
        <Pager page={data.page} pages={data.pages} onChange={setPage} />
      ) : null}

      <ModalSheet
        visible={filters}
        title={t('premiumExtra.checkpoint11.reportFilters')}
        onClose={() => setFilters(false)}
      >
        <SectionTitle title={t('inventory.supplier')} />
        <Button
          fullWidth
          variant={!supplierId ? 'secondary' : 'ghost'}
          label={t('common.all')}
          onPress={() => {
            setSupplierId(null);
            setPage(1);
          }}
        />
        {suppliers.slice(0, 30).map((supplier) => (
          <Button
            key={supplier.id}
            fullWidth
            variant={supplierId === supplier.id ? 'secondary' : 'ghost'}
            label={supplier.name}
            onPress={() => {
              setSupplierId(supplier.id);
              setPage(1);
            }}
          />
        ))}
        <DatePickerField
              label={t('common.from')}
              value={from}
              onChange={setFrom}
            />
        <DatePickerField
              label={t('common.to')}
              value={to}
              onChange={setTo}
            />
        <Button
          fullWidth
          icon="checkmark-outline"
          label={t('premiumExtra.checkpoint11.applyFilters')}
          onPress={() => {
            setPage(1);
            setFilters(false);
            load();
          }}
        />
      </ModalSheet>
    </Screen>
  );
}
