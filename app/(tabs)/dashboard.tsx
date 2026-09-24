import React, { useCallback, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reportService } from '@/modules/reports/service';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Card, Empty, MetricCard, PageHeader, ProgressBar, Screen, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

interface Metrics { revenue: number; count: number; average: number; low: number; out: number; receivable: number; credits: number; cashOpen: boolean; }
interface RecentSale { id: string; number: string; total: number; created_at: string; customer_name: string | null; method: string | null; }
interface TopProduct { id: string; name: string; units: number; revenue: number; }

export default function Dashboard() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [data, setData] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    void Promise.all([
      reportService.dashboard(user.id),
      reportService.recentSales(user.id, 5),
      reportService.topProducts(user.id, 3),
    ]).then(([a, b, c]) => { setData(a); setRecent(b); setTop(c); });
  }, [user?.id]));

  if (!user) return <Screen><Empty /></Screen>;
  const wide = width >= 820;
  const maxUnits = Math.max(1, ...top.map((p) => p.units));

  return (
    <Screen>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={`Hola, ${user.name}. Aquí tienes el pulso de tu negocio.`}
        eyebrow={t('premium.dashboard.maobitsPosLocalFirst')}
        right={<Badge label={data?.cashOpen ? t('dashboard.cashOpen') : t('dashboard.noCash')} tone={data?.cashOpen ? 'success' : 'warning'} icon={data?.cashOpen ? 'radio-button-on' : 'radio-button-off'} />}
      />

      {data ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <MetricCard label={t('dashboard.salesToday')} value={formatMoney(data.revenue, currency, locale)} icon="cash-outline" tone="success" helper="HOY" />
          <MetricCard label={t('dashboard.salesCount')} value={String(data.count)} icon="receipt-outline" helper="VENTAS" />
          <MetricCard label={t('dashboard.receivables')} value={formatMoney(data.receivable, currency, locale)} icon="people-outline" tone={data.receivable > 0 ? 'warning' : 'success'} helper="CC" />
          <MetricCard label={t('dashboard.lowStock')} value={String(data.low + data.out)} icon="alert-circle-outline" tone={(data.low + data.out) > 0 ? 'danger' : 'success'} helper="STOCK" />
        </View>
      ) : null}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'stretch' }}>
        <Card style={{ flex: wide ? 1.6 : undefined }}>
          <SectionTitle title={t('premium.dashboard.recentActivity')} subtitle={t('premium.dashboard.latestSalesConfirmedInSqlite')} />
          {recent.length ? recent.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: th.colors.border }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: th.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={19} color={th.colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: th.colors.text, fontWeight: '900' }}>{s.number}</Text>
                <Text style={{ color: th.colors.muted, fontSize: 12, marginTop: 2 }}>{s.customer_name ?? t('premiumExtra.dashboard.walkInCustomer')} · {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: th.colors.success, fontWeight: '900' }}>{formatMoney(s.total, currency, locale)}</Text>
                <Text style={{ color: th.colors.subtle, fontSize: 11 }}>{s.method ? t(`methods.${s.method}`) : '—'}</Text>
              </View>
            </View>
          )) : <Empty label={t('premium.dashboard.noSalesRecordedTodayYet')} icon="receipt-outline" />}
        </Card>

        <Card variant="dark" style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>{t('premium.dashboard.topProducts')}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 3 }}>{t('premium.dashboard.unitsSold')}</Text>
            </View>
            <Ionicons name="trending-up-outline" size={26} color="#818CF8" />
          </View>
          {top.length ? top.map((p, i) => (
            <View key={p.id} style={{ gap: 7, paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text numberOfLines={1} style={{ color: '#F8FAFC', fontWeight: '800', flex: 1 }}>{p.name}</Text>
                <Text style={{ color: '#C7D2FE', fontWeight: '900' }}>{p.units} uds</Text>
              </View>
              <ProgressBar value={(p.units / maxUnits) * 100} color={i === 0 ? '#818CF8' : i === 1 ? '#22D3EE' : '#34D399'} />
            </View>
          )) : <Text style={{ color: '#94A3B8' }}>{t('premium.dashboard.notEnoughData')}</Text>}
        </Card>
      </View>

      {data ? (
        <Card variant="soft">
          <SectionTitle title={t('premium.dashboard.operationalSummary')} subtitle={t('premium.dashboard.dataCalculatedFromLocalStorage')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
            <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: th.colors.muted, fontSize: 12 }}>{t('premium.dashboard.averageTicket')}</Text><Text style={{ color: th.colors.text, fontWeight: '900', fontSize: 18, marginTop: 4 }}>{formatMoney(data.average, currency, locale)}</Text></View>
            <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: th.colors.muted, fontSize: 12 }}>{t('premium.dashboard.creditBalances')}</Text><Text style={{ color: th.colors.success, fontWeight: '900', fontSize: 18, marginTop: 4 }}>{formatMoney(data.credits, currency, locale)}</Text></View>
            <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: th.colors.muted, fontSize: 12 }}>{t('premium.dashboard.outOfStock')}</Text><Text style={{ color: data.out ? th.colors.danger : th.colors.success, fontWeight: '900', fontSize: 18, marginTop: 4 }}>{data.out}</Text></View>
          </View>
        </Card>
      ) : <Empty />}
    </Screen>
  );
}
