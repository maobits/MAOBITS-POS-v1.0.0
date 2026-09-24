import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, Text, ToastAndroid, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { Page, PaymentMethod, Product, Supplier } from '@/core/types';
import { productService } from '@/modules/products/service';
import { supplierService } from '@/modules/suppliers/service';
import { supplierAccountService } from '@/modules/supplier-account/service';
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
  MoneyField,
  PageHeader,
  Pager,
  Screen,
  SearchBar,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

interface Line {
  product: Product;
  quantity: number;
  unitCost: number;
}

export default function PurchaseFormScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [supplierData, setSupplierData] = useState<Page<Supplier> | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierBalance, setSupplierBalance] = useState(0);

  const [productData, setProductData] = useState<Page<Product> | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const screenRef = useRef<ScrollView>(null);
  const linesAnchorY = useRef(0);
  const [lastAddedProductId, setLastAddedProductId] =
    useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void supplierService
      .page(user.id, supplierSearch, supplierPage, 6, false)
      .then(setSupplierData);
  }, [user?.id, supplierSearch, supplierPage]);

  useEffect(() => {
    void productService
      .page({ search: productSearch }, productPage, 8)
      .then(setProductData);
  }, [productSearch, productPage]);

  useEffect(() => {
    if (!productId) return;
    void productService.get(productId).then((product) => {
      if (!product) return;
      setLines((current) =>
        current.some((line) => line.product.id === product.id)
          ? current
          : [
              ...current,
              {
                product,
                quantity: 1,
                unitCost: product.purchase_cost,
              },
            ],
      );
    });
  }, [productId]);

  async function chooseSupplier(next: Supplier) {
    setSupplier(next);
    if (user) {
      setSupplierBalance(
        await supplierAccountService.balance(user.id, next.id),
      );
    }
  }

  function addProduct(product: Product) {
    setLines((current) => {
      const found = current.find(
        (line) => line.product.id === product.id,
      );

      if (found) {
        return current.map((line) =>
          line.product.id === product.id
            ? {
                ...line,
                quantity: line.quantity + 1,
              }
            : line,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
          unitCost: product.purchase_cost,
        },
      ];
    });

    const message = `${product.name}: ${t(
      'premiumExtra.checkpoint15.addedToPurchase',
    )}`;

    setLastAddedProductId(product.id);
    setAddedMessage(message);

    if (Platform.OS === 'android') {
      ToastAndroid.show(
        message,
        ToastAndroid.SHORT,
      );
    }

    setTimeout(() => {
      screenRef.current?.scrollTo({
        y: Math.max(0, linesAnchorY.current - 18),
        animated: true,
      });
    }, 120);

    setTimeout(() => {
      setLastAddedProductId((current) =>
        current === product.id ? null : current,
      );
      setAddedMessage(null);
    }, 1700);
  }

  function updateLine(
    productIdValue: string,
    patch: Partial<Pick<Line, 'quantity' | 'unitCost'>>,
  ) {
    setLines((current) =>
      current
        .map((line) =>
          line.product.id === productIdValue
            ? {
                ...line,
                ...patch,
                quantity: Math.max(
                  0,
                  Math.round(patch.quantity ?? line.quantity),
                ),
                unitCost: Math.max(
                  0,
                  Math.round(patch.unitCost ?? line.unitCost),
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0,
      ),
    [lines],
  );

  const projectedBalance =
    supplierBalance + total - Math.max(0, payment);

  async function save() {
    if (!user || !supplier || !lines.length) return;

    try {
      setBusy(true);
      const result = await inventoryService.purchase(
        user.id,
        supplier.id,
        lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
        notes,
        has('PRODUCT_COST_VIEW') ? payment : 0,
        paymentMethod,
      );
      router.replace(`/purchase/${result.purchaseId}` as Href);
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!has('INVENTORY_PURCHASE')) {
    return (
      <Screen scrollRef={screenRef}>
        <PageHeader
          title={t('inventory.purchase')}
          subtitle={t('premiumExtra.checkpoint12.purchaseRequiresPermission')}
        />
        <Badge
          label={t('errors.permission')}
          tone="warning"
          icon="lock-closed-outline"
        />
        <Button
          variant="ghost"
          icon="arrow-back"
          label={t('common.previous')}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={t('inventory.purchase')}
        subtitle={t('premiumExtra.checkpoint12.purchaseFormHelp')}
        eyebrow={t('premiumExtra.checkpoint12.purchaseFlow')}
      />

      <Card>
        <SectionTitle
          title={t('inventory.supplier')}
          subtitle={t('premiumExtra.checkpoint12.supplierPaginationHelp')}
        />
        <SearchBar
          placeholder={t('premiumExtra.checkpoint12.searchSupplier')}
          value={supplierSearch}
          onChangeText={(value) => {
            setSupplierSearch(value);
            setSupplierPage(1);
          }}
        />

        {supplierData?.items.length ? (
          supplierData.items.map((item) => (
            <Button
              key={item.id}
              fullWidth
              variant={supplier?.id === item.id ? 'secondary' : 'ghost'}
              icon="business-outline"
              label={item.name}
              onPress={() => void chooseSupplier(item)}
            />
          ))
        ) : (
          <Empty
            label={t('premiumExtra.checkpoint12.noSuppliers')}
            icon="business-outline"
          />
        )}

        {supplierData ? (
          <Pager
            page={supplierData.page}
            pages={supplierData.pages}
            onChange={setSupplierPage}
          />
        ) : null}

        {supplier ? (
          <Card variant="soft">
            <Text style={{ color: th.colors.muted, fontSize: 11 }}>
              {t('premiumExtra.checkpoint12.currentSupplierBalance')}
            </Text>
            <Text
              style={{
                color:
                  supplierBalance > 0
                    ? th.colors.danger
                    : supplierBalance < 0
                      ? th.colors.success
                      : th.colors.heading,
                fontWeight: '900',
                fontSize: 22,
              }}
            >
              {formatMoney(supplierBalance, currency, locale)}
            </Text>
            <Badge
              label={
                supplierBalance > 0
                  ? t('premiumExtra.checkpoint12.weOweSupplier')
                  : supplierBalance < 0
                    ? t('premiumExtra.checkpoint12.supplierCredit')
                    : t('premiumExtra.checkpoint12.upToDate')
              }
              tone={
                supplierBalance > 0
                  ? 'danger'
                  : supplierBalance < 0
                    ? 'success'
                    : 'neutral'
              }
            />
          </Card>
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          title={t('products.title')}
          subtitle={t('premiumExtra.checkpoint12.addProductsToPurchase')}
        />

        <SearchBar
          placeholder={t('premium.products.searchProductSkuOrCode')}
          value={productSearch}
          onChangeText={(value) => {
            setProductSearch(value);
            setProductPage(1);
          }}
        />

        {productData?.items.map((product) => (
          <View
            key={product.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 7,
              borderBottomWidth: 1,
              borderBottomColor: th.colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.text,
                  fontWeight: '800',
                }}
              >
                {product.name}
              </Text>
              <Text style={{ color: th.colors.subtle, fontSize: 11 }}>
                {product.sku}
              </Text>
            </View>
            <Button
              compact
              variant={
                lastAddedProductId === product.id
                  ? 'secondary'
                  : 'ghost'
              }
              icon={
                lastAddedProductId === product.id
                  ? 'checkmark'
                  : 'add'
              }
              label={
                lastAddedProductId === product.id
                  ? t('premiumExtra.checkpoint15.added')
                  : t('pos.add')
              }
              onPress={() => addProduct(product)}
            />
          </View>
        ))}

        {productData ? (
          <Pager
            page={productData.page}
            pages={productData.pages}
            onChange={setProductPage}
          />
        ) : null}
      </Card>

      <Card
        onLayout={(event) => {
          linesAnchorY.current = event.nativeEvent.layout.y;
        }}
      >
        <SectionTitle
          title={t('premiumExtra.checkpoint12.purchaseLines')}
          subtitle={`${lines.length}`}
        />
        {addedMessage ? (
          <Card
            variant="soft"
            style={{
              borderWidth: 1,
              borderColor: th.colors.success,
              backgroundColor: th.colors.successSoft,
            }}
          >
            <Text
              style={{
                color: th.colors.success,
                fontWeight: '900',
              }}
            >
              ✓ {addedMessage}
            </Text>
          </Card>
        ) : null}
        {lines.length ? (
          lines.map((line) => (
            <Card key={line.product.id} variant="soft">
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                }}
              >
                {line.product.name}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Button
                  compact
                  variant="ghost"
                  icon="remove"
                  label="-"
                  onPress={() =>
                    updateLine(line.product.id, {
                      quantity: line.quantity - 1,
                    })
                  }
                />
                <Badge
                  label={`${t('inventory.quantity')}: ${line.quantity}`}
                  tone="info"
                />
                <Button
                  compact
                  variant="ghost"
                  icon="add"
                  label="+"
                  onPress={() =>
                    updateLine(line.product.id, {
                      quantity: line.quantity + 1,
                    })
                  }
                />
              </View>

              {has('PRODUCT_COST_VIEW') ? (
                <MoneyField
                  label={t('inventory.cost')}
                  value={line.unitCost}
                  onChangeMinor={(value) =>
                    updateLine(line.product.id, { unitCost: value })
                  }
                />
              ) : null}

              {has('PRODUCT_COST_VIEW') ? (
                <Text
                  style={{
                    color: th.colors.primary,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(
                    line.quantity * line.unitCost,
                    currency,
                    locale,
                  )}
                </Text>
              ) : null}
            </Card>
          ))
        ) : (
          <Empty
            label={t('premiumExtra.checkpoint12.noPurchaseLines')}
            icon="basket-outline"
          />
        )}
      </Card>

      <Card variant="soft">
        <SectionTitle
          title={t('premiumExtra.checkpoint12.supplierSettlement')}
        />
        {has('PRODUCT_COST_VIEW') ? (
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: th.colors.muted }}>
                {t('pos.total')}
              </Text>
              <Text style={{ color: th.colors.heading, fontWeight: '900' }}>
                {formatMoney(total, currency, locale)}
              </Text>
            </View>

            <SectionTitle title={t('checkout.method')} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['CASH', 'TRANSFER', 'CARD', 'OTHER'] as PaymentMethod[]).map(
                (method) => (
                  <Button
                    key={method}
                    compact
                    variant={paymentMethod === method ? 'secondary' : 'ghost'}
                    label={t(`methods.${method}`)}
                    onPress={() => setPaymentMethod(method)}
                  />
                ),
              )}
            </View>

            <MoneyField
              label={t('checkout.payment')}
              value={payment}
              onChangeMinor={setPayment}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: th.colors.muted }}>
                {t('premiumExtra.checkpoint12.projectedSupplierBalance')}
              </Text>
              <Text
                style={{
                  color:
                    projectedBalance > 0
                      ? th.colors.danger
                      : projectedBalance < 0
                        ? th.colors.success
                        : th.colors.heading,
                  fontWeight: '900',
                }}
              >
                {formatMoney(projectedBalance, currency, locale)}
              </Text>
            </View>
          </View>
        ) : (
          <Badge
            label={t('premiumExtra.checkpoint12.purchaseCostProtected')}
            tone="warning"
            icon="lock-closed-outline"
          />
        )}

        <Input
          label={t('common.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Card>

      <Button
        fullWidth
        icon="save-outline"
        label={t('common.save')}
        disabled={busy || !supplier || !lines.length}
        onPress={save}
      />
    </Screen>
  );
}
