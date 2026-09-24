import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { productService } from '@/modules/products/service';
import { ProductPreviewModal } from '@/modules/products/ui/ProductPreviewModal';
import { categoryService } from '@/modules/categories/service';
import { offerService } from '@/modules/offers/service';
import type { Category, Page, Product } from '@/core/types';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/money';
import { usePreferencesStore } from '@/stores/preferences';
import { useCartStore } from '@/stores/cart';
import { useSessionStore } from '@/stores/session';
import { Badge, Button, Card, Empty, IconButton, ModalSheet, PageHeader, Pager, Screen, SearchBar, Segmented, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Pos() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const has = useSessionStore((s) => s.has);
  const user = useSessionStore((s) => s.user);
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);
  const last = useCartStore((s) => s.lastRemoved);
  const undo = useCartStore((s) => s.undo);
  const appliedOfferId = useCartStore((s) => s.appliedOfferId);
  const appliedOfferName = useCartStore((s) => s.appliedOfferName);
  const applyOffer = useCartStore((s) => s.applyOffer);
  const clearOffer = useCartStore((s) => s.clearOffer);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [activeOffers, setActiveOffers] = useState<Awaited<ReturnType<typeof offerService.activeForPos>>>([]);
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [preview, setPreview] = useState<Product | null>(null);

  const load = useCallback(() => {
    void productService.page({ search, categoryId: category }, page, 12).then(setData);
    void categoryService.allActive().then(setCats);
  }, [search, category, page]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function added(p: Product) {
    add({ productId: p.id, name: p.name, unitPrice: p.sale_price, taxRateBp: p.tax_rate_bp, imageUri: p.featured_image_uri });
    void Haptics.selectionAsync();
    flash(t('pos.added'));
  }

  function removed(id: string) {
    remove(id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    flash(t('pos.removed'));
  }

  const total = useMemo(() => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [items]);
  const discountedTotal = Math.max(0, total - offerDiscount);
  const units = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const categoryOptions = [{ label: t('common.all'), value: 'all' }, ...cats.map((c) => ({ label: c.name, value: c.id }))];

  const CartPanel = () => (
    <Card style={{ flex: wide ? 0.72 : undefined, minWidth: wide ? 340 : undefined, padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: th.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: th.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cart-outline" size={20} color={th.colors.primary} />
          </View>
          <View>
            <Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 17 }}>{t('pos.cart')}</Text>
            <Text style={{ color: th.colors.muted, fontSize: 11 }}>{units} items</Text>
          </View>
        </View>
        <Badge label={formatMoney(discountedTotal, currency, locale)} tone="info" />
      </View>

      <View style={{ gap: 10, padding: 14 }}>
        {items.length ? items.map((i) => (
          <View key={i.productId} style={{ borderRadius: 16, borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surfaceAlt, padding: 12, gap: 9 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {i.imageUri ? <Image source={{ uri: i.imageUri }} style={{ width: 48, height: 48, borderRadius: 13 }} /> : (
                <View style={{ width: 48, height: 48, borderRadius: 13, backgroundColor: th.colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cube-outline" size={22} color={th.colors.subtle} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: th.colors.text, fontWeight: '900' }}>{i.name}</Text>
                <Text style={{ color: th.colors.primary, fontWeight: '900', marginTop: 3 }}>{formatMoney(i.unitPrice * i.quantity, currency, locale)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <IconButton icon={i.quantity === 1 ? 'trash-outline' : 'remove'} label={t('premium.pos.decrease')} tone={i.quantity === 1 ? 'danger' : 'neutral'} onPress={() => i.quantity === 1 ? removed(i.productId) : decrement(i.productId)} />
              <View style={{ minWidth: 44, alignItems: 'center' }}><Text style={{ color: th.colors.text, fontWeight: '900', fontSize: 16 }}>{i.quantity}</Text></View>
              <IconButton icon="add" label={t('premium.pos.increase')} tone="info" onPress={() => increment(i.productId)} />
            </View>
          </View>
        )) : <Empty label={t('pos.emptyCart')} icon="cart-outline" />}
      </View>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: th.colors.border, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: th.colors.muted, fontWeight: '700' }}>{t('pos.total')}</Text>
          <Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 21 }}>{formatMoney(discountedTotal, currency, locale)}</Text>
        </View>
                {appliedOfferId ? (
          <Card variant="soft">
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: th.colors.heading,
                    fontWeight: '900',
                  }}
                >
                  {appliedOfferName}
                </Text>
                <Text
                  style={{
                    color: th.colors.muted,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {t(
                    'premiumExtra.checkpoint18.offerApplied',
                  )}
                </Text>
              </View>
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
          </Card>
        ) : null}
<Button fullWidth icon="wallet-outline" label={`${t('pos.checkout')} · ${formatMoney(discountedTotal, currency, locale)}`} disabled={!items.length} onPress={() => { setCartOpen(false); router.push('/checkout'); }} />
      </View>
    </Card>
  );

  return (
    <Screen>
      <PageHeader title={t('pos.title')} subtitle={t('premium.pos.searchScanAndSellWithoutInterruptingThe')} eyebrow={t('premium.pos.milestone9PosEngine')} right={has('SCANNER_USE') ? <Button compact variant="secondary" icon="barcode-outline" label={t('pos.scan')} onPress={() => router.push('/scanner')} /> : undefined} />

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {has('CATALOG_PRINT') ? (
          <Button
            compact
            variant="secondary"
            icon="albums-outline"
            label={t(
              'premiumExtra.checkpoint18.printCatalog',
            )}
            onPress={() =>
              router.push('/catalog-builder' as Href)
            }
          />
        ) : null}


        {appliedOfferId ? (
          <Button
            compact
            variant="ghost"
            icon="close-circle-outline"
            label={t(
              'premiumExtra.checkpoint18.removeOffer',
            )}
            onPress={() => clearOffer()}
          />
        ) : null}
      </View>

      {activeOffers.length ? (
        <Card variant="soft">
          <SectionTitle
            title={t(
              'premiumExtra.checkpoint18.activeOffers',
            )}
            subtitle={t(
              'premiumExtra.checkpoint18.activeOffersHelp',
            )}
            right={
              <Button
                compact
                variant="ghost"
                icon="eye-outline"
                label={t(
                  'premiumExtra.checkpoint18.viewOffers',
                )}
                onPress={() => setOffersOpen(true)}
              />
            }
          />
          {appliedOfferId ? (
            <Badge
              label={`${appliedOfferName ?? ''} · -${
                formatMoney(
                  offerDiscount,
                  currency,
                  locale,
                )
              }`}
              tone="success"
              icon="pricetag-outline"
            />
          ) : null}
        </Card>
      ) : null}


      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 13, width: '100%' }}>
          <SearchBar placeholder={t('premium.pos.searchProductSkuOrEan')} value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} />
          <Segmented options={categoryOptions} value={category ?? 'all'} onChange={(v) => { setCategory(v === 'all' ? null : v); setPage(1); }} />

          {data?.items.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {data.items.map((p) => (
                <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Agregar ${p.name}`} onPress={() => added(p)} style={({ pressed }) => ({ width: width >= 1180 ? '23.5%' : width >= 760 ? '31.5%' : '48%', minWidth: 150, opacity: pressed ? 0.78 : 1 })}>
                  <Card style={{ padding: 12, minHeight: 215 }}>
                    <View style={{ height: 108, borderRadius: 16, backgroundColor: th.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {p.featured_image_uri ? <Image source={{ uri: p.featured_image_uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Ionicons name="cube-outline" size={42} color={th.colors.subtle} />}
                      {p.stock <= p.minimum_stock ? <View style={{ position: 'absolute', top: 8, left: 8 }}><Badge label={`${t('pos.stock')}: ${p.stock}`} tone={p.stock === 0 ? 'danger' : 'warning'} /></View> : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('premiumExtra.checkpoint11.viewProduct')}
                        onPress={(event) => { event.stopPropagation(); setPreview(p); }}
                        style={({ pressed }) => ({ position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.78)', opacity: pressed ? 0.7 : 1 })}
                      >
                        <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    <Text numberOfLines={2} style={{ color: th.colors.text, fontWeight: '900', fontSize: 15, lineHeight: 20 }}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 17 }}>{formatMoney(p.sale_price, currency, locale)}</Text>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: th.colors.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={22} color="#FFFFFF" /></View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : <Empty label={t('premium.pos.noProductsMatchThatFilter')} icon="search-outline" />}
          {data ? <Pager page={data.page} pages={data.pages} onChange={setPage} /> : null}
        </View>

        {wide ? <CartPanel /> : null}
      </View>

      {!wide ? (
        <Pressable accessibilityRole="button" onPress={() => setCartOpen(true)} style={({ pressed }) => ({ position: 'absolute', left: 18, right: 18, bottom: 18, minHeight: 62, borderRadius: 20, backgroundColor: th.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, opacity: pressed ? 0.82 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="cart-outline" size={23} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{units} · {t('pos.cart')}</Text></View>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 17 }}>{formatMoney(discountedTotal, currency, locale)}</Text>
        </Pressable>
      ) : null}

      {toast ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: wide ? 24 : 92, backgroundColor: th.colors.heading, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: th.dark ? '#0F172A' : '#FFFFFF', fontWeight: '800', flex: 1 }}>{toast}</Text>
          {last ? <Pressable onPress={() => { undo(); flash(t('pos.added')); }}><Text style={{ color: '#A5B4FC', fontWeight: '900' }}>{t('pos.undo')}</Text></Pressable> : null}
        </View>
      ) : null}

      <ModalSheet visible={!wide && cartOpen} title={t('pos.cart')} onClose={() => setCartOpen(false)}><CartPanel /></ModalSheet>
      <ProductPreviewModal product={preview} visible={Boolean(preview)} onClose={() => setPreview(null)} canViewCost={has('PRODUCT_COST_VIEW')} canViewSuppliers={has('SUPPLIERS_VIEW')} />
      <ModalSheet
        visible={offersOpen}
        title={t(
          'premiumExtra.checkpoint18.activeOffers',
        )}
        onClose={() => setOffersOpen(false)}
      >
        {activeOffers.length ? (
          activeOffers.map((offer) => (
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
                .filter((rule) => rule.discount_bp > 0)
                .map((rule) => (
                  <Badge
                    key={`c-${rule.category_id}`}
                    label={`${rule.category_name} · -${
                      rule.discount_bp / 100
                    }%`}
                    tone="info"
                  />
                ))}

              {offer.productRules
                .filter((rule) => rule.discount_bp > 0)
                .slice(0, 8)
                .map((rule) => (
                  <Badge
                    key={`p-${rule.product_id}`}
                    label={`${rule.product_name} · -${
                      rule.discount_bp / 100
                    }%`}
                    tone="success"
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
                  'premiumExtra.checkpoint18.applyOffer',
                )}
                onPress={() => {
                  applyOffer(offer.id, offer.name);
                  setOffersOpen(false);
                  flash(
                    t(
                      'premiumExtra.checkpoint18.offerApplied',
                    ),
                  );
                }}
              />
            </Card>
          ))
        ) : (
          <Empty
            label={t(
              'premiumExtra.checkpoint18.noCatalogs',
            )}
            icon="pricetag-outline"
          />
        )}
      </ModalSheet>

    </Screen>
  );
}
