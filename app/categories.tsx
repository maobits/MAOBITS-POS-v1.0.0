import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import type { Category, Page } from '@/core/types';
import { categoryService } from '@/modules/categories/service';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Empty, IconPicker, type IconName, Input, ModalSheet, PageHeader, Pager, Screen, SearchBar } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Categories() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [data, setData] = useState<Page<Category> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('cube-outline');
  const [report, setReport] = useState<{ products: number; units_sold: number; revenue: number } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const load = useCallback(() => void categoryService.page(search, page, 12, true).then(setData), [search, page]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function newCategory() { setSelected(null); setName(''); setIcon('cube-outline'); setModal(true); }
  function editCategory(c: Category) { setSelected(c); setName(c.name); setIcon((c.icon || 'cube-outline') as IconName); setModal(true); }

  async function save() {
    if (!user) return;
    try {
      if (selected) await categoryService.update(user.id, selected.id, { name, icon });
      else await categoryService.create(user.id, { name, icon });
      setModal(false); setSelected(null); setName(''); setIcon('cube-outline'); load();
    } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); }
  }

  async function openReport(c: Category) {
    if (!user || !has('REPORTS_VIEW')) return;
    try {
      setSelected(c);
      setReport(await categoryService.report(user.id, c.id));
      setReportOpen(true);
    } catch (e) {
      Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown'));
    }
  }

  return (
    <Screen>
      <PageHeader title={t('categories.title')} subtitle={t('premium.categories.organizeTheCatalogAndAnalyzePerformanceBy')} eyebrow={t('premium.categories.milestone5Categories')} right={has('PRODUCTS_EDIT') ? <Button compact icon="add" label={t('categories.new')} onPress={newCategory} /> : undefined} />
      <SearchBar placeholder={t('premium.categories.searchCategory')} value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} />

      {data?.items.length ? data.items.map((c) => {
        const categoryIcon = (c.icon || 'cube-outline') as IconName;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: th.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={categoryIcon} size={22} color={th.colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 16 }}>{c.name}</Text><Text style={{ color: th.colors.muted, fontSize: 12, marginTop: 2 }}>{c.icon}</Text></View>
              <Badge label={c.active ? t('common.active') : t('common.inactive')} tone={c.active ? 'success' : 'warning'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {has('PRODUCTS_EDIT') ? <Button compact variant="ghost" icon="create-outline" label={t('common.edit')} onPress={() => editCategory(c)} /> : null}
              {has('REPORTS_VIEW') ? <Button compact variant="secondary" icon="bar-chart-outline" label={t('categories.report')} onPress={() => void openReport(c)} /> : null}
              {has('PRODUCTS_EDIT') ? <Button compact variant="ghost" icon={c.active ? 'pause-circle-outline' : 'play-circle-outline'} label={c.active ? t('common.inactive') : t('common.active')} onPress={() => void categoryService.setActive(user!.id, c.id, !c.active).then(load)} /> : null}
            </View>
          </Card>
        );
      }) : <Empty label={t('premium.categories.noCategoriesYet')} icon="grid-outline" />}

      {data ? <Pager page={data.page} pages={data.pages} onChange={setPage} /> : null}

      <ModalSheet visible={modal} title={selected ? t('common.edit') : t('categories.new')} onClose={() => setModal(false)}>
        <Input label={t('common.name')} icon="grid-outline" value={name} onChangeText={setName} autoCapitalize="words" />
        <IconPicker label={t('categories.icon')} value={icon} onChange={setIcon} />
        <Button fullWidth icon="save-outline" label={t('common.save')} disabled={!name.trim()} onPress={() => void save()} />
      </ModalSheet>

      <ModalSheet visible={reportOpen} title={selected?.name ?? t('categories.report')} onClose={() => setReportOpen(false)}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 130 }}><Text style={{ color: th.colors.muted, fontSize: 11 }}>{t('premium.categories.products')}</Text><Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 24 }}>{report?.products ?? 0}</Text></Card>
          <Card style={{ flex: 1, minWidth: 130 }}><Text style={{ color: th.colors.muted, fontSize: 11 }}>{t('premium.categories.units')}</Text><Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 24 }}>{report?.units_sold ?? 0}</Text></Card>
          <Card style={{ flex: 1, minWidth: 150 }}><Text style={{ color: th.colors.muted, fontSize: 11 }}>{t('premium.categories.revenue')}</Text><Text style={{ color: th.colors.primary, fontWeight: '900', fontSize: 20 }}>{formatMoney(report?.revenue ?? 0, currency, locale)}</Text></Card>
        </View>
      </ModalSheet>
    </Screen>
  );
}
