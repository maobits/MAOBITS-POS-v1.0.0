import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  reportService,
  type ReportFilter,
} from '@/modules/reports/service';
import { settingsService } from '@/modules/settings/service';
import {
  generalReportHtml,
  printReceipt,
  shareReceipt,
} from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { BarChart, DonutChart, LineChart } from '@/shared/charts';
import {
  Badge,
  Button,
  Card,
  DatePickerField,
  Empty,
  Input,
  ModalSheet,
  PageHeader,
  ProgressBar,
  Screen,
  SectionTitle,
  Segmented,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

type Period = 'today' | '7d' | '30d' | '90d' | 'year' | 'all' | 'custom';
type GeneralModule =
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'sales'
  | 'cash'
  | 'cashiers'
  | 'taxes'
  | 'inventory';

function periodFilter(period: Period): ReportFilter {
  if (period === 'all' || period === 'custom') return {};

  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date(to);
  from.setHours(0, 0, 0, 0);

  if (period === 'today') {
    // Keep today's local start/end.
  } else if (period === '7d') {
    from.setDate(from.getDate() - 6);
  } else if (period === '30d') {
    from.setDate(from.getDate() - 29);
  } else if (period === '90d') {
    from.setDate(from.getDate() - 89);
  } else if (period === 'year') {
    from.setFullYear(from.getFullYear() - 1);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

const GENERAL_MODULES: GeneralModule[] = [
  'products',
  'categories',
  'suppliers',
  'sales',
  'cash',
  'cashiers',
  'taxes',
  'inventory',
];

export default function Reports() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [trend, setTrend] = useState<{ day: string; total: number }[]>([]);
  const [cats, setCats] = useState<{ name: string; total: number }[]>([]);
  const [payments, setPayments] =
    useState<{ method: string; total: number }[]>([]);
  const [purchases, setPurchases] =
    useState<{ name: string; total: number; count: number }[]>([]);
  const [accounts, setAccounts] =
    useState<{ name: string; balance: number }[]>([]);
  const [supplierAccounts, setSupplierAccounts] =
    useState<{ name: string; balance: number }[]>([]);
  const [cash, setCash] =
    useState<Awaited<ReturnType<typeof reportService.cashSummary>> | null>(null);
  const [purchaseSummary, setPurchaseSummary] =
    useState<Awaited<ReturnType<typeof reportService.purchaseSummary>> | null>(null);
  const [balances, setBalances] =
    useState<Awaited<ReturnType<typeof reportService.generalBalances>> | null>(null);
  const [offerAnalytics, setOfferAnalytics] =
    useState<Awaited<ReturnType<typeof reportService.offersSummary>> | null>(null);

  const [period, setPeriod] = useState<Period>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [selectedModules, setSelectedModules] =
    useState<GeneralModule[]>([...GENERAL_MODULES]);
  const [activeFilter, setActiveFilter] =
    useState<ReportFilter>(() => periodFilter('30d'));

  async function load(filter: ReportFilter) {
    if (!user) return;
    const [a, b, c, d, e, f, g, h, i] = await Promise.all([
      reportService.salesTrend(user.id, filter),
      reportService.byCategory(user.id, filter),
      reportService.paymentMethods(user.id, filter),
      reportService.purchasesBySupplier(user.id, filter),
      reportService.customerAccounts(user.id),
      reportService.supplierAccounts(user.id),
      reportService.cashSummary(user.id, filter),
      reportService.purchaseSummary(user.id, filter),
      reportService.generalBalances(user.id, filter),
    ]);

    setTrend(a);
    setCats(b);
    setPayments(c);
    setPurchases(d);
    setAccounts(e);
    setSupplierAccounts(f);
    setCash(g);
    setPurchaseSummary(h);
    setBalances(i);
  }

  useEffect(() => {
    void load(activeFilter);
  }, [user?.id, activeFilter.from, activeFilter.to]);

  function selectPeriod(value: string) {
    const next = value as Period;
    setPeriod(next);
    if (next !== 'custom') {
      setActiveFilter(periodFilter(next));
    }
  }

  function applyCustom() {
    setActiveFilter({
      from: from
        ? new Date(`${from}T00:00:00`).toISOString()
        : undefined,
      to: to
        ? new Date(`${to}T23:59:59`).toISOString()
        : undefined,
    });
    setFiltersOpen(false);
  }

  function toggleModule(module: GeneralModule) {
    setSelectedModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
  }

  const paymentTotal = useMemo(
    () => payments.reduce((sum, item) => sum + item.total, 0),
    [payments],
  );

  const salesTotal = useMemo(
    () => trend.reduce((sum, item) => sum + item.total, 0),
    [trend],
  );

  const periodLabel =
    period === 'custom'
      ? `${from || '…'} → ${to || '…'}`
      : t(`premiumExtra.checkpoint11.period_${period}`);

  function reportSections() {
    if (!balances) return [];

    const sections: {
      title: string;
      rows: { label: string; value: string }[];
    }[] = [];

    if (selectedModules.includes('products')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceProducts'),
        rows: [
          {
            label: t('products.title'),
            value: String(balances.products.count),
          },
          {
            label: t('common.units'),
            value: String(balances.products.units),
          },
          ...(has('PRODUCT_COST_VIEW')
            ? [
                {
                  label: t('premiumExtra.checkpoint12.costValue'),
                  value: formatMoney(
                    balances.products.cost_value,
                    currency,
                    locale,
                  ),
                },
              ]
            : []),
          {
            label: t('premiumExtra.checkpoint12.saleValue'),
            value: formatMoney(
              balances.products.sale_value,
              currency,
              locale,
            ),
          },
        ],
      });
    }

    if (selectedModules.includes('categories')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceCategories'),
        rows: [
          {
            label: t('categories.title'),
            value: String(balances.categories.count),
          },
          {
            label: t('products.title'),
            value: String(balances.categories.active_products),
          },
        ],
      });
    }

    if (selectedModules.includes('suppliers')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceSuppliers'),
        rows: [
          {
            label: t('suppliers.title'),
            value: String(balances.suppliers.count),
          },
          ...(has('PRODUCT_COST_VIEW')
            ? [
                {
                  label: t('premiumExtra.checkpoint12.payable'),
                  value: formatMoney(
                    balances.suppliers.payable,
                    currency,
                    locale,
                  ),
                },
                {
                  label: t('premiumExtra.checkpoint12.supplierCredit'),
                  value: formatMoney(
                    balances.suppliers.credit,
                    currency,
                    locale,
                  ),
                },
              ]
            : []),
        ],
      });
    }

    if (selectedModules.includes('sales')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceSales'),
        rows: [
          {
            label: t('sales.title'),
            value: String(balances.sales.count),
          },
          {
            label: t('pos.total'),
            value: formatMoney(
              balances.sales.total,
              currency,
              locale,
            ),
          },
        ],
      });
    }

    if (selectedModules.includes('cash')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceCash'),
        rows: [
          {
            label: t('premiumExtra.checkpoint12.sessions'),
            value: String(balances.cash.sessions),
          },
          {
            label: t('cash.difference'),
            value: formatMoney(
              balances.cash.difference,
              currency,
              locale,
            ),
          },
          {
            label: t('cash.expense'),
            value: formatMoney(
              balances.cash.expenses,
              currency,
              locale,
            ),
          },
          {
            label: t('cash.withdrawal'),
            value: formatMoney(
              balances.cash.withdrawals,
              currency,
              locale,
            ),
          },
        ],
      });
    }

    if (selectedModules.includes('cashiers')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceCashiers'),
        rows: [
          {
            label: t('premiumExtra.checkpoint12.cashiers'),
            value: String(balances.cashiers.count),
          },
          {
            label: t('cash.difference'),
            value: formatMoney(
              balances.cashiers.differences,
              currency,
              locale,
            ),
          },
        ],
      });
    }

    if (selectedModules.includes('taxes')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceTaxes'),
        rows: [
          {
            label: t('products.tax'),
            value: formatMoney(
              balances.taxes.total,
              currency,
              locale,
            ),
          },
        ],
      });
    }

    if (selectedModules.includes('inventory')) {
      sections.push({
        title: t('premiumExtra.checkpoint12.balanceInventory'),
        rows: [
          {
            label: t('common.units'),
            value: String(balances.inventory.units),
          },
          {
            label: t('inventory.low'),
            value: String(balances.inventory.low),
          },
          {
            label: t('inventory.out'),
            value: String(balances.inventory.out),
          },
        ],
      });
    }

    return sections;
  }

  async function generalHtml() {
    const branding = await settingsService.receiptBranding();
    return generalReportHtml(
      t('premiumExtra.checkpoint12.generalReport'),
      periodLabel,
      reportSections(),
      branding,
    );
  }

  async function printGeneral() {
    try {
      await printReceipt(await generalHtml());
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function shareGeneral() {
    try {
      await shareReceipt(
        await generalHtml(),
        'MAOBITS-reporte-general',
      );
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed'));
    }
  }

  const periodOptions = [
    {
      label: t('premiumExtra.checkpoint11.period_today'),
      value: 'today',
    },
    {
      label: t('premiumExtra.checkpoint11.period_7d'),
      value: '7d',
    },
    {
      label: t('premiumExtra.checkpoint11.period_30d'),
      value: '30d',
    },
    {
      label: t('premiumExtra.checkpoint11.period_90d'),
      value: '90d',
    },
    {
      label: t('premiumExtra.checkpoint11.period_year'),
      value: 'year',
    },
    {
      label: t('premiumExtra.checkpoint11.period_all'),
      value: 'all',
    },
  ];

  return (
    <Screen>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('premium.reports.localAnalyticsCalculatedDirectlyFromSqlite')}
        eyebrow={t('premium.reports.milestone13Reports')}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              compact
              variant="secondary"
              icon="options-outline"
              label={t('premiumExtra.checkpoint11.reportFilters')}
              onPress={() => setFiltersOpen(true)}
            />
            <Button
              compact
              icon="document-text-outline"
              label={t('premiumExtra.checkpoint12.generalReport')}
              onPress={() => setGeneralOpen(true)}
            />
          </View>
        }
      />

      <Segmented
        options={periodOptions}
        value={period === 'custom' ? '30d' : period}
        onChange={selectPeriod}
      />

      <Badge
        label={periodLabel}
        tone="info"
        icon="calendar-outline"
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Card style={{ flex: 1, minWidth: 165 }}>
          <Text style={{ color: th.colors.muted, fontSize: 11 }}>
            {t('premium.reports.periodSales')}
          </Text>
          <Text
            style={{
              color: th.colors.heading,
              fontWeight: '900',
              fontSize: 22,
            }}
          >
            {formatMoney(salesTotal, currency, locale)}
          </Text>
        </Card>

        {has('PRODUCT_COST_VIEW') ? (
          <Card style={{ flex: 1, minWidth: 165 }}>
            <Text style={{ color: th.colors.muted, fontSize: 11 }}>
              {t('premiumExtra.checkpoint12.purchasesTitle')}
            </Text>
            <Text
              style={{
                color: th.colors.heading,
                fontWeight: '900',
                fontSize: 22,
              }}
            >
              {formatMoney(
                purchaseSummary?.total ?? 0,
                currency,
                locale,
              )}
            </Text>
          </Card>
        ) : null}

        <Card style={{ flex: 1, minWidth: 165 }}>
          <Text style={{ color: th.colors.muted, fontSize: 11 }}>
            {t('premiumExtra.checkpoint12.cashDifference')}
          </Text>
          <Text
            style={{
              color:
                (cash?.difference ?? 0) === 0
                  ? th.colors.success
                  : th.colors.warning,
              fontWeight: '900',
              fontSize: 22,
            }}
          >
            {formatMoney(
              cash?.difference ?? 0,
              currency,
              locale,
            )}
          </Text>
        </Card>

        <Card style={{ flex: 1, minWidth: 165 }}>
          <Text style={{ color: th.colors.muted, fontSize: 11 }}>
            {t('premiumExtra.checkpoint12.supplierPayable')}
          </Text>
          <Text
            style={{
              color: th.colors.danger,
              fontWeight: '900',
              fontSize: 22,
            }}
          >
            {formatMoney(
              balances?.suppliers.payable ?? 0,
              currency,
              locale,
            )}
          </Text>
        </Card>
      </View>

      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        <Card style={{ flex: 1.4 }}>
          <SectionTitle
            title={t('reports.salesTrend')}
            subtitle={periodLabel}
          />
          {trend.length ? (
            <LineChart
              data={trend.map((item) => ({
                label: item.day.slice(5),
                value: item.total,
              }))}
            />
          ) : (
            <Empty
              label={t('premium.reports.notEnoughSales')}
              icon="analytics-outline"
            />
          )}
        </Card>

        <Card style={{ flex: 1 }}>
          <SectionTitle
            title={t('reports.paymentMethods')}
            subtitle={t('premium.reports.distributionByValue')}
          />
          {payments.length ? (
            <>
              <DonutChart
                data={payments.map((item) => ({
                  label: item.method,
                  value: item.total,
                }))}
              />
              <View style={{ gap: 10 }}>
                {payments.map((item, index) => {
                  const percent = paymentTotal
                    ? Math.round((item.total / paymentTotal) * 100)
                    : 0;
                  return (
                    <View key={item.method} style={{ gap: 5 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            color: th.colors.muted,
                            fontWeight: '700',
                          }}
                        >
                          {t(`methods.${item.method}`)}
                        </Text>
                        <Text
                          style={{
                            color: th.colors.text,
                            fontWeight: '900',
                          }}
                        >
                          {percent}%
                        </Text>
                      </View>
                      <ProgressBar
                        value={percent}
                        color={
                          index === 0
                            ? th.colors.primary
                            : index === 1
                              ? th.colors.success
                              : th.colors.accent
                        }
                      />
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Empty />
          )}
        </Card>
      </View>

      <Card>
        <SectionTitle
          title={t('reports.byCategory')}
          subtitle={t('premium.reports.revenueGroupedByCategory')}
        />
        {cats.length ? (
          <BarChart
            data={cats.map((item) => ({
              label: item.name,
              value: item.total,
            }))}
          />
        ) : (
          <Empty />
        )}
      </Card>

      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: 14,
        }}
      >
        {has('PRODUCT_COST_VIEW') ? (
          <Card style={{ flex: 1 }}>
            <SectionTitle
              title={t('reports.purchases')}
              subtitle={t('premium.reports.accumulatedCostBySupplier')}
            />
            {purchases.length ? (
              purchases.slice(0, 10).map((item) => (
                <View
                  key={item.name}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: th.colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={17}
                      color={th.colors.muted}
                    />
                    <Text
                      style={{
                        color: th.colors.text,
                        fontWeight: '800',
                      }}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: th.colors.heading,
                      fontWeight: '900',
                    }}
                  >
                    {formatMoney(item.total, currency, locale)}
                  </Text>
                </View>
              ))
            ) : (
              <Empty
                label={t('premium.reports.noPurchasesRecorded')}
                icon="business-outline"
              />
            )}
          </Card>
        ) : null}

        <Card style={{ flex: 1 }}>
          <SectionTitle
            title={t('premiumExtra.checkpoint12.cashAnalysis')}
            subtitle={t('premiumExtra.checkpoint12.balanceByCashier')}
          />
          {cash?.cashiers.length ? (
            <>
              <BarChart
                data={cash.cashiers.map((item) => ({
                  label: item.name,
                  value: Math.abs(item.difference),
                }))}
              />
              <View style={{ gap: 7 }}>
                <Text style={{ color: th.colors.muted }}>
                  {t('cash.expense')}: {' '}
                  {formatMoney(
                    cash.expenses,
                    currency,
                    locale,
                  )}
                </Text>
                <Text style={{ color: th.colors.muted }}>
                  {t('cash.withdrawal')}: {' '}
                  {formatMoney(
                    cash.withdrawals,
                    currency,
                    locale,
                  )}
                </Text>
              </View>
            </>
          ) : (
            <Empty icon="cash-outline" />
          )}
        </Card>
      </View>

      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: 14,
        }}
      >
        <Card style={{ flex: 1 }}>
          <SectionTitle
            title={t('reports.accounts')}
            subtitle={t('premium.reports.debtsAndCreditBalances')}
          />
          {accounts.length ? (
            accounts.slice(0, 10).map((item) => (
              <View
                key={item.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: th.colors.border,
                }}
              >
                <Text
                  style={{
                    color: th.colors.text,
                    fontWeight: '800',
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color:
                      item.balance > 0
                        ? th.colors.danger
                        : th.colors.success,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(item.balance, currency, locale)}
                </Text>
              </View>
            ))
          ) : (
            <Empty
              label={t('premium.reports.customersUpToDate')}
              icon="people-outline"
            />
          )}
        </Card>

        {has('PRODUCT_COST_VIEW') ? (
          <Card style={{ flex: 1 }}>
          <SectionTitle
            title={t('premiumExtra.checkpoint12.supplierAccounts')}
            subtitle={t('premiumExtra.checkpoint12.supplierAccountsHelp')}
          />
          {supplierAccounts.length ? (
            supplierAccounts.slice(0, 10).map((item) => (
              <View
                key={item.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: th.colors.border,
                }}
              >
                <Text
                  style={{
                    color: th.colors.text,
                    fontWeight: '800',
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color:
                      item.balance > 0
                        ? th.colors.danger
                        : th.colors.success,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(item.balance, currency, locale)}
                </Text>
              </View>
            ))
          ) : (
            <Empty
              label={t('premiumExtra.checkpoint12.suppliersUpToDate')}
              icon="business-outline"
            />
          )}
        </Card>
        ) : null}
      </View>

      <Card>
        <SectionTitle
          title={t(
            'premiumExtra.checkpoint18.reportsOffers',
          )}
          subtitle={t(
            'premiumExtra.checkpoint18.reportsOffersHelp',
          )}
        />

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Card
            variant="soft"
            style={{ flex: 1, minWidth: 150 }}
          >
            <Text
              style={{
                color: th.colors.muted,
                fontSize: 11,
              }}
            >
              {t(
                'premiumExtra.checkpoint18.totalOfferDiscounts',
              )}
            </Text>
            <Text
              style={{
                color: th.colors.success,
                fontWeight: '900',
                fontSize: 21,
              }}
            >
              {formatMoney(
                offerAnalytics?.discount ?? 0,
                currency,
                locale,
              )}
            </Text>
          </Card>

          <Card
            variant="soft"
            style={{ flex: 1, minWidth: 150 }}
          >
            <Text
              style={{
                color: th.colors.muted,
                fontSize: 11,
              }}
            >
              {t(
                'premiumExtra.checkpoint18.offerSales',
              )}
            </Text>
            <Text
              style={{
                color: th.colors.heading,
                fontWeight: '900',
                fontSize: 21,
              }}
            >
              {offerAnalytics?.sales ?? 0}
            </Text>
          </Card>
        </View>

        {offerAnalytics?.rows.length ? (
          offerAnalytics.rows.map((row) => (
            <View
              key={row.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderBottomColor: th.colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: th.colors.text,
                    fontWeight: '900',
                  }}
                >
                  {row.name}
                </Text>
                <Text
                  style={{
                    color: th.colors.muted,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {row.sales} {t(
                    'premiumExtra.checkpoint18.offerSales',
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
                  row.discount,
                  currency,
                  locale,
                )}
              </Text>
            </View>
          ))
        ) : (
          <Empty
            label={t(
              'premiumExtra.checkpoint18.noEligibleProducts',
            )}
            icon="pricetag-outline"
          />
        )}
      </Card>

      <ModalSheet
        visible={filtersOpen}
        title={t('premiumExtra.checkpoint11.reportFilters')}
        onClose={() => setFiltersOpen(false)}
      >
        <Segmented
          options={[
            ...periodOptions,
            {
              label: t('premiumExtra.checkpoint11.period_custom'),
              value: 'custom',
            },
          ]}
          value={period}
          onChange={selectPeriod}
        />

        {period === 'custom' ? (
          <>
            <DatePickerField
              label={t('premiumExtra.checkpoint11.fromDate')}
              value={from}
              onChange={setFrom}
            />
            <DatePickerField
              label={t('premiumExtra.checkpoint11.toDate')}
              value={to}
              onChange={setTo}
            />
          </>
        ) : null}

        <Button
          fullWidth
          icon="checkmark-outline"
          label={t('premiumExtra.checkpoint11.applyFilters')}
          onPress={() => {
            if (period === 'custom') applyCustom();
            else setFiltersOpen(false);
          }}
        />
      </ModalSheet>

      <ModalSheet
        visible={generalOpen}
        title={t('premiumExtra.checkpoint12.generalReport')}
        onClose={() => setGeneralOpen(false)}
      >
        <SectionTitle
          title={t('premiumExtra.checkpoint12.chooseReportModules')}
          subtitle={t('premiumExtra.checkpoint12.chooseReportModulesHelp')}
        />

        {GENERAL_MODULES.map((module) => {
          const selected = selectedModules.includes(module);
          return (
            <Card
              key={module}
              onPress={() => toggleModule(module)}
              variant={selected ? 'primary' : 'soft'}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons
                  name={
                    selected
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={22}
                  color={
                    selected
                      ? '#FFFFFF'
                      : th.colors.muted
                  }
                />
                <Text
                  style={{
                    color:
                      selected
                        ? '#FFFFFF'
                        : th.colors.heading,
                    fontWeight: '900',
                    flex: 1,
                  }}
                >
                  {t(
                    `premiumExtra.checkpoint12.balance_${module}`,
                  )}
                </Text>
              </View>
            </Card>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            fullWidth
            icon="print-outline"
            label={t('sales.print')}
            disabled={!selectedModules.length}
            onPress={printGeneral}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
