import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { inventoryService } from '@/modules/inventory/service';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
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

interface InvRow {
  id: string;
  name: string;
  category_name: string | null;
  stock: number;
  minimum_stock: number;
  purchase_cost: number;
  sale_price: number;
  status: string;
}

export default function Inventory() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [rows, setRows] = useState<InvRow[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 12,
    pages: 1,
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<InvRow | null>(null);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState({
    activeProducts: 0,
    unitsInStock: 0,
    lowStock: 0,
    outOfStock: 0,
    inventoryCost: 0,
  });

  const load = useCallback(() => {
    if (!user) return;

    void Promise.all([
      inventoryService.overview(user.id, search, page, 12),
      inventoryService.summary(user.id),
    ]).then(([nextPage, nextSummary]) => {
      setRows(nextPage.items);
      setPagination({
        total: nextPage.total,
        page: nextPage.page,
        pageSize: nextPage.pageSize,
        pages: nextPage.pages,
      });
      setSummary(nextSummary);
    });
  }, [user?.id, search, page]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const delta = Number(qty) || 0;
  const deltaColor =
    delta > 0
      ? th.colors.success
      : delta < 0
        ? th.colors.danger
        : th.colors.muted;

  async function submitAdjust() {
    if (!user || !selected) return;

    try {
      await inventoryService.adjust(
        user.id,
        selected.id,
        delta,
        note,
      );
      setAdjustOpen(false);
      load();
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  return (
    <Screen>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('premium.inventory.realTimeStockPurchasingAndAlertControl')}
        eyebrow={t('premium.inventory.milestone7Inventory')}
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Card style={{ flex: 1, minWidth: 145 }}>
          <Text style={{ color: th.colors.muted, fontSize: 12 }}>
            {t('premiumExtra.checkpoint15.activeProducts')}
          </Text>
          <Text
            style={{
              color: th.colors.heading,
              fontWeight: '900',
              fontSize: 23,
            }}
          >
            {summary.activeProducts}
          </Text>
        </Card>

        <Card style={{ flex: 1, minWidth: 145 }}>
          <Text style={{ color: th.colors.muted, fontSize: 12 }}>
            {t('premiumExtra.checkpoint15.unitsInStock')}
          </Text>
          <Text
            style={{
              color: th.colors.heading,
              fontWeight: '900',
              fontSize: 23,
            }}
          >
            {summary.unitsInStock}
          </Text>
        </Card>

        <Card style={{ flex: 1, minWidth: 145 }}>
          <Text style={{ color: th.colors.muted, fontSize: 12 }}>
            {t('inventory.low')}
          </Text>
          <Text
            style={{
              color: summary.lowStock
                ? th.colors.warning
                : th.colors.success,
              fontWeight: '900',
              fontSize: 23,
            }}
          >
            {summary.lowStock}
          </Text>
        </Card>

        <Card style={{ flex: 1, minWidth: 145 }}>
          <Text style={{ color: th.colors.muted, fontSize: 12 }}>
            {t('inventory.out')}
          </Text>
          <Text
            style={{
              color: summary.outOfStock
                ? th.colors.danger
                : th.colors.success,
              fontWeight: '900',
              fontSize: 23,
            }}
          >
            {summary.outOfStock}
          </Text>
        </Card>

        {has('PRODUCT_COST_VIEW') ? (
          <Card style={{ flex: 1, minWidth: 165 }}>
            <Text style={{ color: th.colors.muted, fontSize: 12 }}>
              {t('premium.inventory.inventoryAtCost')}
            </Text>
            <Text
              style={{
                color: th.colors.heading,
                fontWeight: '900',
                fontSize: 20,
              }}
            >
              {formatMoney(
                summary.inventoryCost,
                currency,
                locale,
              )}
            </Text>
          </Card>
        ) : null}
      </View>

      <SearchBar
        placeholder={t('premium.inventory.searchProductOrCategory')}
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <SectionTitle
        title={t('premium.inventory.stockOverview')}
        subtitle={`${rows.length} ${t(
          'premiumExtra.checkpoint15.productsShown',
        )} · ${pagination.total} total`}
        right={
          has('PURCHASES_VIEW') ? (
            <Button
              compact
              variant="ghost"
              icon="receipt-outline"
              label={t('premiumExtra.checkpoint12.purchaseHistory')}
              onPress={() => router.push('/purchases' as Href)}
            />
          ) : undefined
        }
      />

      {rows.length ? (
        rows.map((row) => (
          <Card key={row.id}>
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  backgroundColor:
                    row.status === 'OUT'
                      ? th.colors.dangerSoft
                      : row.status === 'LOW'
                        ? th.colors.warningSoft
                        : th.colors.successSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="cube-outline"
                  size={23}
                  color={
                    row.status === 'OUT'
                      ? th.colors.danger
                      : row.status === 'LOW'
                        ? th.colors.warning
                        : th.colors.success
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: th.colors.text,
                    fontWeight: '900',
                    fontSize: 16,
                  }}
                >
                  {row.name}
                </Text>
                <Text
                  style={{
                    color: th.colors.muted,
                    marginTop: 2,
                    fontSize: 12,
                  }}
                >
                  {row.category_name ??
                    t('premiumExtra.inventory.uncategorized')}{' '}
                  · {formatMoney(row.sale_price, currency, locale)}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text
                  style={{
                    color: th.colors.heading,
                    fontWeight: '900',
                    fontSize: 18,
                  }}
                >
                  {row.stock} {t('premiumExtra.checkpoint15.units')}
                </Text>
                <Badge
                  label={
                    row.status === 'OUT'
                      ? t('inventory.out')
                      : row.status === 'LOW'
                        ? t('inventory.low')
                        : 'OK'
                  }
                  tone={
                    row.status === 'OUT'
                      ? 'danger'
                      : row.status === 'LOW'
                        ? 'warning'
                        : 'success'
                  }
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {has('INVENTORY_ADJUST') ? (
                <Button
                  compact
                  variant="ghost"
                  icon="swap-vertical-outline"
                  label={t('inventory.adjust')}
                  onPress={() => {
                    setSelected(row);
                    setQty('1');
                    setNote('');
                    setAdjustOpen(true);
                  }}
                />
              ) : null}

              {has('INVENTORY_PURCHASE') ? (
                <Button
                  compact
                  variant="secondary"
                  icon="bag-add-outline"
                  label={t('inventory.purchase')}
                  onPress={() =>
                    router.push(
                      `/purchase-form?productId=${encodeURIComponent(
                        row.id,
                      )}` as Href,
                    )
                  }
                />
              ) : null}

              {has('PRODUCT_COST_VIEW') ? (
                <Badge
                  label={`${t('products.cost')} ${formatMoney(
                    row.purchase_cost,
                    currency,
                    locale,
                  )}`}
                  tone="neutral"
                  icon="lock-closed-outline"
                />
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <Empty
          label={t('premium.inventory.noInventoryProductsFound')}
          icon="cube-outline"
        />
      )}

      {pagination.pages > 1 ? (
        <Pager
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      ) : null}

      <ModalSheet
        visible={adjustOpen}
        title={t('inventory.adjust')}
        onClose={() => setAdjustOpen(false)}
      >
        <Badge
          label={selected?.name ?? ''}
          tone="info"
          icon="cube-outline"
        />

        <Card
          variant="soft"
          style={{
            borderWidth: 2,
            borderColor: deltaColor,
            backgroundColor:
              delta > 0
                ? th.colors.successSoft
                : delta < 0
                  ? th.colors.dangerSoft
                  : th.colors.surfaceAlt,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons
              name={
                delta > 0
                  ? 'add-circle-outline'
                  : delta < 0
                    ? 'remove-circle-outline'
                    : 'swap-vertical-outline'
              }
              size={30}
              color={deltaColor}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: deltaColor,
                  fontWeight: '900',
                  fontSize: 17,
                }}
              >
                {delta > 0
                  ? t('premiumExtra.checkpoint12.stockAdds')
                  : delta < 0
                    ? t('premiumExtra.checkpoint12.stockSubtracts')
                    : t('premiumExtra.checkpoint12.stockNeutral')}
              </Text>
              <Text style={{ color: th.colors.muted, marginTop: 3 }}>
                {selected
                  ? `${selected.stock} → ${Math.max(
                      0,
                      selected.stock + delta,
                    )}`
                  : ''}
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            compact
            variant="ghost"
            icon="remove"
            label="-1"
            onPress={() => setQty(String(delta - 1))}
          />
          <View style={{ flex: 1 }}>
            <Input
              label={t('inventory.quantity')}
              value={qty}
              onChangeText={setQty}
              keyboardType="numbers-and-punctuation"
              hint={t('premium.inventory.usePositiveValuesForStockInAnd')}
            />
          </View>
          <Button
            compact
            variant="ghost"
            icon="add"
            label="+1"
            onPress={() => setQty(String(delta + 1))}
          />
        </View>

        <Input
          label={t('common.notes')}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Button
          fullWidth
          icon="save-outline"
          label={t('common.save')}
          disabled={!delta}
          onPress={submitAdjust}
        />
      </ModalSheet>
    </Screen>
  );
}
