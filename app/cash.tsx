import React, { useCallback, useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { cashService, type CashSessionSummary } from '@/modules/cash/service';
import { CashCounterModal } from '@/modules/cash/ui/CashCounterModal';
import { cashMovementLabel } from '@/modules/cash/labels';
import { settingsService } from '@/modules/settings/service';
import { cashReceiptHtml, printReceipt, shareReceipt } from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Empty, Input, ModalSheet, MoneyField, PageHeader, Screen, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

interface Movement { id: string; type: string; amount: number; note: string | null; created_at: string; }

export default function Cash() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const user = useSessionStore((s) => s.user);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [current, setCurrent] = useState<{ id: string; opening_amount: number; opened_at: string } | null>(null);
  const [expected, setExpected] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [opening, setOpening] = useState(0);
  const [amount, setAmount] = useState(0);
  const [counted, setCounted] = useState(0);
  const [note, setNote] = useState('');
  const [modal, setModal] = useState<'movement' | 'close' | null>(null);
  const [movementType, setMovementType] = useState<'INCOME' | 'WITHDRAWAL' | 'EXPENSE'>('INCOME');
  const [closedSummary, setClosedSummary] = useState<CashSessionSummary | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [cashCounterOpen, setCashCounterOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    void cashService.current(user.id).then(async (v) => {
      const session = v as typeof current;
      setCurrent(session);
      if (session) {
        setExpected(await cashService.expected(user.id, session.id));
        setMovements(await cashService.movements(user.id, session.id));
      } else { setExpected(0); setMovements([]); }
    });
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function open() { if (!user) return; try { await cashService.open(user.id, opening); load(); } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); } }
  async function movement() { if (!user || !current) return; try { await cashService.addMovement(user.id, current.id, movementType, amount, note); setAmount(0); setNote(''); setModal(null); load(); } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); } }
  async function close() {
    if (!user || !current) return;
    try {
      const sessionId = current.id;
      await cashService.close(user.id, sessionId, counted, note);
      const summary = await cashService.summary(user.id, sessionId);
      setClosedSummary(summary);
      setModal(null);
      setReceiptOpen(true);
      setNote('');
      load();
    } catch (e) { Alert.alert('MAOBITS POS', e instanceof Error ? t(e.message) : t('errors.unknown')); }
  }

  async function ticketHtml() {
    if (!closedSummary) return '';
    const branding = await settingsService.receiptBranding();
    return cashReceiptHtml(closedSummary, branding, currency, locale);
  }

  async function printTicket() {
    try { const html = await ticketHtml(); if (html) await printReceipt(html); }
    catch { Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed')); }
  }

  async function shareTicket() {
    try { const html = await ticketHtml(); if (html && closedSummary) await shareReceipt(html, `MAOBITS-cierre-${closedSummary.id}`); }
    catch { Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed')); }
  }

  return (
    <Screen>
      <PageHeader
        title={t('cash.title')}
        subtitle={t('premium.cash.currentShiftMovementsAndTraceableCashCount')}
        eyebrow={t('premium.cash.milestone11Cash')}
        right={
          <Button
            compact
            variant="secondary"
            icon="analytics-outline"
            label={t('premiumExtra.checkpoint12.cashHistory')}
            onPress={() => router.push('/cash-history' as Href)}
          />
        }
      />
      {current ? (
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'stretch' }}>
          <Card variant="primary" style={{ flex: 0.9, minHeight: 330 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}><Badge label={t('premium.cash.openShift')} tone="success" icon="radio-button-on" /><Ionicons name="cash-outline" size={42} color="rgba(255,255,255,0.22)" /></View>
            <Text style={{ color: '#C7D2FE', fontWeight: '700', fontSize: 12 }}>{t('premium.cash.expectedCash')}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 38, letterSpacing: -1 }}>{formatMoney(expected, currency, locale)}</Text>
            <View style={{ gap: 9, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#C7D2FE' }}>{t('cash.opening')}</Text><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{formatMoney(current.opening_amount, currency, locale)}</Text></View>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.16)' }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#C7D2FE' }}>{t('premium.cash.open')}</Text><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{new Date(current.opened_at).toLocaleString()}</Text></View>
            </View>
            <View style={{ flex: 1 }} />
            <Button fullWidth variant="dark" icon="lock-closed-outline" label={t('cash.close')} onPress={() => { setCounted(expected); setModal('close'); }} />
          </Card>

          <Card style={{ flex: 1.5 }}>
            <SectionTitle title={t('premium.cash.shiftMovements')} subtitle={`${movements.length} registros`} right={<Button compact icon="add" label={t('cash.addMovement')} onPress={() => { setMovementType('INCOME'); setAmount(0); setNote(''); setModal('movement'); }} />} />
            {movements.length ? movements.map((m) => {
              const positive = m.amount >= 0;
              return <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: th.colors.border }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: positive ? th.colors.successSoft : th.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={positive ? 'arrow-up-outline' : 'arrow-down-outline'} size={19} color={positive ? th.colors.success : th.colors.danger} /></View><View style={{ flex: 1 }}><Text style={{ color: th.colors.text, fontWeight: '800' }}>{m.note || cashMovementLabel(m.type, locale)}</Text><Text style={{ color: th.colors.muted, fontSize: 11, marginTop: 2 }}>{cashMovementLabel(m.type, locale)} · {new Date(m.created_at).toLocaleTimeString()}</Text></View><Text style={{ color: positive ? th.colors.success : th.colors.danger, fontWeight: '900' }}>{formatMoney(m.amount, currency, locale)}</Text></View>;
            }) : <Empty label={t('premium.cash.noMovementsInThisShiftYet')} icon="swap-vertical-outline" />}
          </Card>
        </View>
      ) : (
        <Card style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: th.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cash-outline" size={30} color={th.colors.primary} /></View>
          <SectionTitle title={t('premium.cash.openCashShift')} subtitle={t('premium.cash.setTheOpeningAmountBeforeAcceptingCash')} />
          <MoneyField label={t('cash.opening')} value={opening} onChangeMinor={setOpening} />
          <Button fullWidth icon="lock-open-outline" label={t('cash.open')} onPress={open} />
        </Card>
      )}

      <ModalSheet visible={modal === 'movement'} title={t('cash.addMovement')} onClose={() => setModal(null)}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Button label={t('cash.income')} variant={movementType === 'INCOME' ? 'secondary' : 'ghost'} onPress={() => setMovementType('INCOME')} /><Button label={t('cash.withdrawal')} variant={movementType === 'WITHDRAWAL' ? 'secondary' : 'ghost'} onPress={() => setMovementType('WITHDRAWAL')} /><Button label={t('cash.expense')} variant={movementType === 'EXPENSE' ? 'secondary' : 'ghost'} onPress={() => setMovementType('EXPENSE')} /></View>
        <MoneyField label={t('common.amount')} value={amount} onChangeMinor={setAmount} /><Input label={t('common.notes')} value={note} onChangeText={setNote} /><Button fullWidth icon="save-outline" label={t('common.save')} disabled={amount <= 0} onPress={movement} />
      </ModalSheet>

      <ModalSheet visible={modal === 'close'} title={t('cash.close')} onClose={() => setModal(null)}><Card variant="warning"><Text style={{ color: th.colors.warning, fontWeight: '900' }}>{t('cash.expected')}: {formatMoney(expected, currency, locale)}</Text></Card><View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <MoneyField
              label={t('cash.counted')}
              value={counted}
              onChangeMinor={setCounted}
            />
          </View>
          <Button
            compact
            variant="secondary"
            icon="calculator-outline"
            label={t(
              'premiumExtra.checkpoint17.openCounter',
            )}
            onPress={() => setCashCounterOpen(true)}
          />
        </View><Input label={t('common.notes')} value={note} onChangeText={setNote} /><Button fullWidth variant="danger" icon="lock-closed-outline" label={t('cash.close')} onPress={close} /></ModalSheet>
      <ModalSheet visible={receiptOpen} title={t('premiumExtra.checkpoint11.closeReceipt')} onClose={() => setReceiptOpen(false)}>{closedSummary ? <><Card variant="soft"><SectionTitle title={closedSummary.user_name} subtitle={new Date(closedSummary.closed_at ?? closedSummary.opened_at).toLocaleString()} /><Text style={{ color: th.colors.muted }}>{t('cash.expected')}: {formatMoney(closedSummary.expected_amount ?? 0, currency, locale)}</Text><Text style={{ color: th.colors.muted }}>{t('cash.counted')}: {formatMoney(closedSummary.counted_amount ?? 0, currency, locale)}</Text><Text style={{ color: (closedSummary.difference ?? 0) === 0 ? th.colors.success : th.colors.warning, fontWeight: '900' }}>{t('cash.difference')}: {formatMoney(closedSummary.difference ?? 0, currency, locale)}</Text></Card><Button fullWidth icon="print-outline" label={t('premiumExtra.checkpoint11.printTicket')} onPress={printTicket} /><Button fullWidth variant="ghost" icon="share-outline" label={t('premiumExtra.checkpoint11.sharePdf')} onPress={shareTicket} /></> : null}</ModalSheet>
      <CashCounterModal
        visible={cashCounterOpen}
        currency={currency}
        locale={locale}
        onClose={() => setCashCounterOpen(false)}
        onApply={(total) => {
          setCounted(total);
        }}
      />

    </Screen>
  );
}
