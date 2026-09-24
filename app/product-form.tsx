import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { Category, ProductImage, Supplier } from '@/core/types';
import { categoryService } from '@/modules/categories/service';
import { supplierService } from '@/modules/suppliers/service';
import { productService } from '@/modules/products/service';
import { generateEan13 } from '@/core/barcode/ean13';
import { printBarcodeLabel, shareBarcodeLabel } from '@/core/barcode/print';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Input, ModalSheet, MoneyField, PageHeader, Screen, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [tax, setTax] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [unit, setUnit] = useState('und');
  const [initialStock, setInitialStock] = useState('0');
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [active, setActiveState] = useState(true);
  const [selector, setSelector] = useState<'category' | 'supplier' | null>(null);
  const [report, setReport] = useState<{ units: number; revenue: number; last_sale: string | null } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    void categoryService.allActive().then(setCategories);
    void supplierService.allActive().then(setSuppliers);
    if (id) void (async () => {
      const p = await productService.get(id); if (!p) return;
      setSku(p.sku); setBarcode(p.barcode ?? ''); setName(p.name); setDescription(p.description); setCategoryId(p.category_id);
      setCost(p.purchase_cost); setPrice(p.sale_price); setTax(String(p.tax_rate_bp / 100)); setMinStock(String(p.minimum_stock)); setUnit(p.unit); setActiveState(Boolean(p.active));
      setSupplierIds((await productService.suppliers(id)).map((s) => s.supplier_id)); setImages(await productService.images(id));
    })();
  }, [id]);

  async function save() {
    if (!user) return;
    const input = { sku, barcode: barcode || null, name, description, categoryId, purchaseCost: cost, salePrice: price, taxRateBp: Math.round((Number(tax) || 0) * 100), minimumStock: Math.max(0, Number(minStock) || 0), unit, supplierIds };
    try {
      if (id) await productService.update(user.id, id, input);
      else await productService.create(user.id, { ...input, initialStock: Math.max(0, Number(initialStock) || 0) });
      router.back();
    } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); }
  }

  async function addImage() {
    if (!user || !id) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85 });
    if (result.canceled) return;
    await productService.addImage(user.id, id, result.assets[0]!.uri, images.length === 0);
    setImages(await productService.images(id));
  }
  async function featured(imageId: string) { if (!user || !id) return; await productService.setFeatured(user.id, id, imageId); setImages(await productService.images(id)); }
  async function removeImage(imageId: string) { if (!user || !id) return; await productService.removeImage(user.id, imageId); setImages(await productService.images(id)); }
  const cat = categories.find((c) => c.id === categoryId);

  return (
    <Screen>
      <PageHeader title={id ? t('premiumExtra.productForm.editProduct', { name: name || t('premiumExtra.productForm.productFallback') }) : t('products.new')} subtitle={t('premium.product_form.commercialDataStockSuppliersImagesAndLabel')} eyebrow={t('premium.product_form.milestone6Product')} />
      <Card>
        <SectionTitle title={t('premium.product_form.commercialIdentity')} subtitle={t('premium.product_form.informationVisibleInCatalogAndPos')} />
        <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Input label={t('products.sku')} icon="pricetag-outline" value={sku} onChangeText={setSku} /></View><View style={{ flex: 1 }}><Input label={t('products.unit')} value={unit} onChangeText={setUnit} /></View></View>
        <Input label={t('common.name')} icon="cube-outline" value={name} onChangeText={setName} />
        <Input label={t('common.description')} value={description} onChangeText={setDescription} multiline />
        <Button fullWidth variant="ghost" icon="grid-outline" label={`${t('products.category')}: ${cat?.name ?? t('premiumExtra.productForm.select')}`} onPress={() => setSelector('category')} />
      </Card>

      <Card>
        <SectionTitle title={t('premium.product_form.priceAndTaxes')} subtitle={t('premium.product_form.monetaryValuesStoredInMinorUnits')} />
        {has('PRODUCT_COST_VIEW') ? <MoneyField label={t('products.cost')} value={cost} onChangeMinor={setCost} /> : <Badge label={t('premium.product_form.costProtectedByProductCostView')} tone="warning" icon="lock-closed-outline" />}
        <MoneyField label={t('products.price')} value={price} onChangeMinor={setPrice} />
        <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Input label={t('products.tax')} value={tax} onChangeText={setTax} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Input label={t('products.minStock')} value={minStock} onChangeText={setMinStock} keyboardType="number-pad" /></View></View>
        {!id ? <Input label={t('products.stock')} value={initialStock} onChangeText={setInitialStock} keyboardType="number-pad" /> : null}
      </Card>

      <Card>
        <SectionTitle title={t('premium.product_form.ean13AndSuppliers')} subtitle={t('premium.product_form.supplyContractAndLabel')} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}><View style={{ flex: 1 }}><Input label={t('products.barcode')} icon="barcode-outline" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" /></View><Button compact variant="secondary" icon="sparkles-outline" label={t('premium.product_form.generate')} onPress={() => setBarcode(generateEan13())} /></View>
        <Button fullWidth variant="ghost" icon="business-outline" label={`${t('products.suppliers')}: ${supplierIds.length}`} onPress={() => setSelector('supplier')} />
        {id && barcode ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Button compact variant="secondary" icon="print-outline" label={t('products.printLabel')} onPress={() => void printBarcodeLabel({ name, barcode, priceText: formatMoney(price, currency, locale) })} /><Button compact variant="ghost" icon="share-outline" label={t('sales.share')} onPress={() => void shareBarcodeLabel({ name, barcode, priceText: formatMoney(price, currency, locale) })} /></View> : null}
      </Card>

      {id ? <Card><SectionTitle title={t('products.images')} subtitle={t('premium.product_form.localPersistenceWithOneFeaturedImage')} right={<Button compact icon="image-outline" label={t('premium.product_form.add')} onPress={addImage} />} />{images.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{images.map((img) => <View key={img.id} style={{ width: 105, gap: 6 }}><Image source={{ uri: img.uri }} style={{ width: 105, height: 105, borderRadius: 16, borderWidth: img.is_featured ? 3 : 1, borderColor: img.is_featured ? th.colors.primary : th.colors.border }} /><Button compact label={img.is_featured ? t('products.featured') : 'Destacar'} variant={img.is_featured ? 'secondary' : 'ghost'} onPress={() => void featured(img.id)} /><Button compact label={t('premium.product_form.delete')} variant="danger" onPress={() => void removeImage(img.id)} /></View>)}</View> : <Badge label={t('premium.product_form.noImagesYet')} tone="neutral" icon="image-outline" />}</Card> : null}

      <Card variant="soft">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {id && user ? <Button variant="ghost" icon={active ? 'pause-circle-outline' : 'play-circle-outline'} label={active ? t('common.inactive') : t('common.active')} onPress={() => void productService.setActive(user.id, id, !active).then(() => setActiveState(!active))} /> : null}
          {id && has('REPORTS_VIEW') ? <Button variant="ghost" icon="bar-chart-outline" label={t('products.report')} onPress={() => void productService.miniReport(user!.id, id).then((r) => { setReport(r); setReportOpen(true); })} /> : null}
          <View style={{ flex: 1 }} /><Button icon="save-outline" label={t('common.save')} onPress={save} />
        </View>
      </Card>

      <ModalSheet visible={selector === 'category'} title={t('products.category')} onClose={() => setSelector(null)}>{categories.map((c) => <Button key={c.id} fullWidth label={c.name} variant={categoryId === c.id ? 'secondary' : 'ghost'} onPress={() => { setCategoryId(c.id); setSelector(null); }} />)}</ModalSheet>
      <ModalSheet visible={selector === 'supplier'} title={t('products.suppliers')} onClose={() => setSelector(null)}>{suppliers.map((s) => <Button key={s.id} fullWidth label={`${supplierIds.includes(s.id) ? '✓ ' : ''}${s.name}`} variant={supplierIds.includes(s.id) ? 'secondary' : 'ghost'} onPress={() => setSupplierIds((v) => v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id])} />)}</ModalSheet>
      <ModalSheet visible={reportOpen} title={t('products.report')} onClose={() => setReportOpen(false)}><Card variant="soft"><Text style={{ color: th.colors.muted }}>{t('common.units')}</Text><Text style={{ color: th.colors.heading, fontSize: 24, fontWeight: '900' }}>{report?.units ?? 0}</Text></Card><Card variant="soft"><Text style={{ color: th.colors.muted }}>{t('common.revenue')}</Text><Text style={{ color: th.colors.heading, fontSize: 24, fontWeight: '900' }}>{formatMoney(report?.revenue ?? 0, currency, locale)}</Text></Card><Text style={{ color: th.colors.muted }}>{t('common.lastSale')}: {report?.last_sale ?? '—'}</Text></ModalSheet>
    </Screen>
  );
}
