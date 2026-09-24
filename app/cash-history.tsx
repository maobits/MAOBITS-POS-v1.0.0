import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { cashService } from '@/modules/cash/service';
import { settingsService } from '@/modules/settings/service';
import {
  cashReceiptHtml,
  generalReportHtml,
  printReceipt,
  shareReceipt,
} from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { BarChart, DonutChart } from '@/shared/charts';
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
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function CashHistoryScreen() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [page, setPage] = useState(1);
  const [sessions, setSessions] =
    useState<Awaited<ReturnType<typeof cashService.sessionPage>> | null>(null);
  const [analytics, setAnalytics] =
    useState<Awaited<ReturnType<typeof cashService.analytics>> | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fromIso = from
    ? new Date(`${from}T00:00:00`).toISOString()
    : undefined;
  const toIso = to
    ? new Date(`${to}T23:59:59`).toISOString()
    : undefined;

  async function load(nextPage = page) {
    if (!user) return;
    const [nextSessions, nextAnalytics] = await Promise.all([
      cashService.sessionPage(
        user.id,
        nextPage,
        10,
        fromIso,
        toIso,
      ),
      cashService.analytics(user.id, fromIso, toIso),
    ]);
    setSessions(nextSessions);
    setAnalytics(nextAnalytics);
  }

  useEffect(() => {
    void load();
  }, [user?.id, page, from, to]);

  const flowTotal = useMemo(
    () =>
      (analytics?.expenses ?? 0) +
      (analytics?.withdrawals ?? 0) +
      (analytics?.income ?? 0),
    [analytics],
  );

  async function sessionHtml(sessionId: string) {
    if (!user) return '';
    const [summary, branding] = await Promise.all([
      cashService.summary(user.id, sessionId),
      settingsService.receiptBranding(),
    ]);
    return cashReceiptHtml(summary, branding, currency, locale);
  }

  async function printSession(sessionId: string) {
    try {
      await printReceipt(await sessionHtml(sessionId));
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function shareSession(sessionId: string) {
    try {
      await shareReceipt(
        await sessionHtml(sessionId),
        `MAOBITS-caja-${sessionId}`,
      );
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed'));
    }
  }

  async function analyticsHtml() {
    if (!analytics) return '';
    const branding = await settingsService.receiptBranding();
    return generalReportHtml(
      t('premiumExtra.checkpoint12.cashAnalysis'),
      `${from || '∞'} → ${to || '∞'}`,
      [
        {
          title: t('premiumExtra.checkpoint12.cashGeneralBalance'),
          rows: [
            {
              label: t('premiumExtra.checkpoint12.sessions'),
              value: String(analytics.sessions),
            },
            {
              label: t('cash.expected'),
              value: formatMoney(
                analytics.expected,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.counted'),
              value: formatMoney(
                analytics.counted,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.difference'),
              value: formatMoney(
                analytics.difference,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.expense'),
              value: formatMoney(
                analytics.expenses,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.withdrawal'),
              value: formatMoney(
                analytics.withdrawals,
                currency,
                locale,
              ),
            },
          ],
        },
        ...analytics.cashiers.map((cashier) => ({
          title: cashier.user_name,
          rows: [
            {
              label: t('premiumExtra.checkpoint12.sessions'),
              value: String(cashier.sessions),
            },
            {
              label: t('cash.difference'),
              value: formatMoney(
                cashier.difference,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.expense'),
              value: formatMoney(
                cashier.expenses,
                currency,
                locale,
              ),
            },
            {
              label: t('cash.withdrawal'),
              value: formatMoney(
                cashier.withdrawals,
                currency,
                locale,
              ),
            },
          ],
        })),
      ],
      branding,
    );
  }

  return (
    <Screen>
      <PageHeader
        title={t('premiumExtra.checkpoint12.cashHistory')}
        subtitle={
          analytics?.isAdmin
            ? t('premiumExtra.checkpoint12.adminCashVisibility')
            : t('premiumExtra.checkpoint12.cashierOwnCashVisibility')
        }
        eyebrow={t('premiumExtra.checkpoint12.cashControl')}
        right={
          <Button
            compact
            variant="secondary"
            icon="options-outline"
            label={t('premiumExtra.checkpoint11.reportFilters')}
            onPress={() => setFiltersOpen(true)}
          />
        }
      />

      {analytics ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Card style={{ flex: 1, minWidth: 150 }}>
              <Text style={{ color: th.colors.muted, fontSize: 11 }}>
                {t('premiumExtra.checkpoint12.sessions')}
              </Text>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  fontSize: 24,
                }}
              >
                {analytics.sessions}
              </Text>
            </Card>

            <Card style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: th.colors.muted, fontSize: 11 }}>
                {t('cash.difference')}
              </Text>
              <Text
                style={{
                  color:
                    analytics.difference === 0
                      ? th.colors.success
                      : th.colors.warning,
                  fontWeight: '900',
                  fontSize: 21,
                }}
              >
                {formatMoney(
                  analytics.difference,
                  currency,
                  locale,
                )}
              </Text>
            </Card>

            <Card style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: th.colors.muted, fontSize: 11 }}>
                {t('cash.expense')}
              </Text>
              <Text
                style={{
                  color: th.colors.danger,
                  fontWeight: '900',
                  fontSize: 21,
                }}
              >
                {formatMoney(
                  analytics.expenses,
                  currency,
                  locale,
                )}
              </Text>
            </Card>

            <Card style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ color: th.colors.muted, fontSize: 11 }}>
                {t('cash.withdrawal')}
              </Text>
              <Text
                style={{
                  color: th.colors.warning,
                  fontWeight: '900',
                  fontSize: 21,
                }}
              >
                {formatMoney(
                  analytics.withdrawals,
                  currency,
                  locale,
                )}
              </Text>
            </Card>
          </View>

          <Card>
            <SectionTitle
              title={t('premiumExtra.checkpoint12.cashFlowPercentages')}
            />
            <DonutChart
              data={[
                {
                  label: t('premiumExtra.checkpoint12.income'),
                  value: analytics.income,
                },
                {
                  label: t('cash.expense'),
                  value: analytics.expenses,
                },
                {
                  label: t('cash.withdrawal'),
                  value: analytics.withdrawals,
                },
              ]}
            />
            <View style={{ gap: 6 }}>
              <Text style={{ color: th.colors.muted }}>
                {t('cash.expense')}: {' '}
                {flowTotal
                  ? Math.round(
                      (analytics.expenses / flowTotal) * 100,
                    )
                  : 0}
                %
              </Text>
              <Text style={{ color: th.colors.muted }}>
                {t('cash.withdrawal')}: {' '}
                {flowTotal
                  ? Math.round(
                      (analytics.withdrawals / flowTotal) * 100,
                    )
                  : 0}
                %
              </Text>
            </View>
          </Card>

          {analytics.cashiers.length ? (
            <Card>
              <SectionTitle
                title={t('premiumExtra.checkpoint12.balanceByCashier')}
              />
              <BarChart
                data={analytics.cashiers.map((cashier) => ({
                  label: cashier.user_name,
                  value: Math.abs(cashier.difference),
                }))}
              />
              {analytics.cashiers.map((cashier) => {
                const cashierFlow =
                  cashier.income + cashier.expenses + cashier.withdrawals;
                const expensePercent = cashierFlow
                  ? Math.round((cashier.expenses / cashierFlow) * 100)
                  : 0;
                const withdrawalPercent = cashierFlow
                  ? Math.round((cashier.withdrawals / cashierFlow) * 100)
                  : 0;

                return (
                  <View
                    key={cashier.user_id}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: th.colors.border,
                      gap: 7,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: th.colors.text,
                          fontWeight: '900',
                          flex: 1,
                        }}
                      >
                        {cashier.user_name}
                      </Text>
                      <Text
                        style={{
                          color:
                            cashier.difference === 0
                              ? th.colors.success
                              : th.colors.warning,
                          fontWeight: '900',
                        }}
                      >
                        {formatMoney(
                          cashier.difference,
                          currency,
                          locale,
                        )}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 7,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Badge
                        label={`${t('cash.expense')}: ${formatMoney(
                          cashier.expenses,
                          currency,
                          locale,
                        )} · ${expensePercent}%`}
                        tone="danger"
                      />
                      <Badge
                        label={`${t('cash.withdrawal')}: ${formatMoney(
                          cashier.withdrawals,
                          currency,
                          locale,
                        )} · ${withdrawalPercent}%`}
                        tone="warning"
                      />
                      <Badge
                        label={`${t('premiumExtra.checkpoint12.income')}: ${formatMoney(
                          cashier.income,
                          currency,
                          locale,
                        )}`}
                        tone="success"
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon="print-outline"
              label={t('sales.print')}
              onPress={() =>
                void analyticsHtml()
                  .then(printReceipt)
                  .catch(() =>
                    Alert.alert(
                      'MAOBITS POS',
                      t('premiumExtra.checkpoint11.pdfFailed'),
                    ),
                  )
              }
            />
          </View>
        </>
      ) : null}

      <Card>
        <SectionTitle
          title={t('premiumExtra.checkpoint12.shiftHistory')}
        />
        {sessions?.items.length ? (
          sessions.items.map((session) => (
            <Card
              key={session.id}
              variant="soft"
              onPress={() => setSelectedId(session.id)}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: th.colors.heading,
                      fontWeight: '900',
                    }}
                  >
                    {session.user_name}
                  </Text>
                  <Text
                    style={{
                      color: th.colors.muted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {new Date(session.opened_at).toLocaleString()}
                  </Text>
                </View>

                <Badge
                  label={session.status}
                  tone={
                    session.status === 'OPEN'
                      ? 'success'
                      : 'neutral'
                  }
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Badge
                  label={`${t('cash.difference')}: ${formatMoney(
                    session.difference ?? 0,
                    currency,
                    locale,
                  )}`}
                  tone={
                    (session.difference ?? 0) === 0
                      ? 'success'
                      : 'warning'
                  }
                />
                <Badge
                  label={`${t('cash.expense')}: ${formatMoney(
                    session.expenses,
                    currency,
                    locale,
                  )}`}
                  tone="danger"
                />
                <Badge
                  label={`${t('cash.withdrawal')}: ${formatMoney(
                    session.withdrawals,
                    currency,
                    locale,
                  )}`}
                  tone="warning"
                />
              </View>
            </Card>
          ))
        ) : (
          <Empty
            label={t('premiumExtra.checkpoint12.noCashSessions')}
            icon="cash-outline"
          />
        )}

        {sessions ? (
          <Pager
            page={sessions.page}
            pages={sessions.pages}
            onChange={setPage}
          />
        ) : null}
      </Card>

      <ModalSheet
        visible={Boolean(selectedId)}
        title={t('premiumExtra.checkpoint12.cashSession')}
        onClose={() => setSelectedId(null)}
      >
        {selectedId ? (
          <>
            <Button
              fullWidth
              icon="print-outline"
              label={t('premiumExtra.checkpoint11.printTicket')}
              onPress={() => void printSession(selectedId)}
            />
          </>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={filtersOpen}
        title={t('premiumExtra.checkpoint11.reportFilters')}
        onClose={() => setFiltersOpen(false)}
      >
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
            setFiltersOpen(false);
            void load(1);
          }}
        />
      </ModalSheet>

      <Button
        fullWidth
        variant="ghost"
        icon="arrow-back"
        label={t('common.previous')}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
