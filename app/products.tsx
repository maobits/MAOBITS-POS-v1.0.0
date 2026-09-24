import React, { useCallback, useState } from 'react';
import { Image, Text, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { Page, Product } from '@/core/types';
import { productService } from '@/modules/products/service';
import { ProductPreviewModal } from '@/modules/products/ui/ProductPreviewModal';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Empty, PageHeader, Pager, Screen, SearchBar } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Products() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [preview, setPreview] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    void productService.page({ search }, page, 12).then(setData);
  }, [search, page]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cols = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const cardWidth = `${(100 / cols) - 2}%` as DimensionValue;

  return (
    <Screen>
      <PageHeader
        title={t('products.title')}
        subtitle={t('premium.products.professionalCatalogImagesSuppliersAndEan13')}
        eyebrow={t('premium.products.milestone6Catalog')}
        right={has('PRODUCTS_EDIT') ? (
          <Button compact icon="add" label={t('products.new')} onPress={() => router.push('/product-form')} />
        ) : undefined}
      />
      <SearchBar
        placeholder={t('premium.products.searchProductSkuOrCode')}
        value={search}
        onChangeText={(value) => { setSearch(value); setPage(1); }}
      />

      {data?.items.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {data.items.map((product) => (
            <View key={product.id} style={{ width: cardWidth, minWidth: 155 }}>
              <Card>
                <View
                  style={{
                    height: 112,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: th.colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {product.featured_image_uri ? (
                    <Image
                      source={{ uri: product.featured_image_uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="cube-outline" size={40} color={th.colors.subtle} />
                  )}
                  {!product.active ? (
                    <View style={{ position: 'absolute', top: 8, right: 8 }}>
                      <Badge label={t('common.inactive')} tone="danger" />
                    </View>
                  ) : null}
                </View>
                <View>
                  <Text numberOfLines={1} style={{ color: th.colors.heading, fontWeight: '900', fontSize: 15 }}>
                    {product.name}
                  </Text>
                  <Text style={{ color: th.colors.muted, fontSize: 11, marginTop: 3 }}>
                    {product.sku} · {product.category_name ?? t('premiumExtra.inventory.uncategorized')}
                  </Text>
                </View>
                <Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 18 }}>
                  {formatMoney(product.sale_price, currency, locale)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Badge
                    label={`${t('pos.stock')}: ${product.stock}`}
                    tone={product.stock <= product.minimum_stock ? 'warning' : 'success'}
                  />
                  {has('PRODUCT_COST_VIEW') ? (
                    <Badge
                      label={`${t('products.cost')} ${formatMoney(product.purchase_cost, currency, locale)}`}
                      tone="neutral"
                      icon="lock-closed-outline"
                    />
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    compact
                    variant="ghost"
                    icon="eye-outline"
                    label={t('premiumExtra.checkpoint11.viewProduct')}
                    onPress={() => setPreview(product)}
                  />
                  {has('PRODUCTS_EDIT') ? (
                    <Button
                      compact
                      variant="secondary"
                      icon="create-outline"
                      label={t('common.edit')}
                      onPress={() => router.push({ pathname: '/product-form', params: { id: product.id } })}
                    />
                  ) : null}
                </View>
              </Card>
            </View>
          ))}
        </View>
      ) : (
        <Empty label={t('premium.products.noProductsForThisFilter')} icon="cube-outline" />
      )}
      {data ? <Pager page={data.page} pages={data.pages} onChange={setPage} /> : null}

      <ProductPreviewModal
        product={preview}
        visible={Boolean(preview)}
        onClose={() => setPreview(null)}
        canViewCost={has('PRODUCT_COST_VIEW')}
        canViewSuppliers={has('SUPPLIERS_VIEW')}
      />
    </Screen>
  );
}
