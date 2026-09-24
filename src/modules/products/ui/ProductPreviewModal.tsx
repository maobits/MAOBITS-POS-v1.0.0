import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product, ProductImage } from '@/core/types';
import { productService } from '@/modules/products/service';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Card, ModalSheet, SectionTitle } from '@/shared/ui';
import { ZoomableImage } from '@/shared/ZoomableImage';
import { useAppTheme } from '@/core/theme/useAppTheme';

export function ProductPreviewModal({
  product,
  visible,
  onClose,
  canViewCost,
  canViewSuppliers,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  canViewCost: boolean;
  canViewSuppliers: boolean;
}) {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [suppliers, setSuppliers] = useState<{ name: string; preferred: number }[]>([]);
  const [index, setIndex] = useState(0);
  const imageWidth = Math.min(Math.max(width - 72, 240), 620);

  useEffect(() => {
    if (!visible || !product) return;
    setIndex(0);
    void Promise.all([
      productService.images(product.id),
      canViewSuppliers ? productService.suppliers(product.id) : Promise.resolve([]),
    ]).then(([nextImages, nextSuppliers]) => {
      setImages(nextImages);
      setSuppliers(nextSuppliers);
    });
  }, [visible, product?.id, canViewSuppliers]);

  return (
    <ModalSheet
      visible={visible}
      title={product?.name ?? t('premiumExtra.checkpoint11.viewProduct')}
      onClose={onClose}
    >
      {product ? (
        <>
          {images.length ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const next = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
                  setIndex(Math.max(0, Math.min(images.length - 1, next)));
                }}
              >
                {images.map((image) => (
                  <ZoomableImage
                    key={image.id}
                    uri={image.uri}
                    resizeMode="cover"
                    style={{
                      width: imageWidth,
                      height: Math.min(360, imageWidth * 0.72),
                      borderRadius: 22,
                      backgroundColor: th.colors.surfaceAlt,
                    }}
                  />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {images.map((image, position) => (
                  <View
                    key={image.id}
                    style={{
                      width: position === index ? 18 : 7,
                      height: 7,
                      borderRadius: 99,
                      backgroundColor: position === index ? th.colors.primary : th.colors.border,
                    }}
                  />
                ))}
              </View>
            </>
          ) : (
            <View
              style={{
                height: 220,
                borderRadius: 22,
                backgroundColor: th.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="images-outline" size={44} color={th.colors.subtle} />
              <Text style={{ color: th.colors.muted }}>
                {t('premiumExtra.checkpoint11.noProductImages')}
              </Text>
            </View>
          )}

          <Card>
            <SectionTitle
              title={product.name}
              subtitle={product.category_name ?? t('premiumExtra.inventory.uncategorized')}
            />
            {product.description ? (
              <Text style={{ color: th.colors.muted, lineHeight: 19 }}>
                {product.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={`SKU: ${product.sku}`} tone="neutral" />
              {product.barcode ? <Badge label={`EAN: ${product.barcode}`} tone="neutral" /> : null}
              <Badge
                label={`${t('pos.stock')}: ${product.stock}`}
                tone={product.stock === 0 ? 'danger' : product.stock <= product.minimum_stock ? 'warning' : 'success'}
              />
            </View>
            <Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 25 }}>
              {formatMoney(product.sale_price, currency, locale)}
            </Text>
            {canViewCost ? (
              <Badge
                label={`${t('products.cost')}: ${formatMoney(product.purchase_cost, currency, locale)}`}
                tone="warning"
                icon="lock-closed-outline"
              />
            ) : null}
          </Card>

          {canViewSuppliers && suppliers.length ? (
            <Card variant="soft">
              <SectionTitle title={t('products.suppliers')} />
              {suppliers.map((supplier) => (
                <View
                  key={supplier.name}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}
                >
                  <Text style={{ color: th.colors.text, fontWeight: '800' }}>{supplier.name}</Text>
                  {supplier.preferred ? (
                    <Badge
                      label={t('premiumExtra.checkpoint11.preferredSupplier')}
                      tone="info"
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </ModalSheet>
  );
}
