import React, { useCallback, useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Customer, Page, PaymentMethod } from '@/core/types';
import { customerService } from '@/modules/customers/service';
import { customerAccountService } from '@/modules/customer-account/service';
import { settingsService } from '@/modules/settings/service';
import {
  accountMovementTicketHtml,
  accountReportHtml,
  customerHistoryReportHtml,
  printReceipt,
  shareReceipt,
} from '@/core/pdf/receipt';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  ModalSheet,
  MoneyField,
  PageHeader,
  Pager,
  Screen,
  SearchBar,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

type CustomerForm = {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type AccountEntry = {
  id: string;
  type: string;
  impact_minor: number;
  note: string | null;
  created_at: string;
};

type HistoryRow = {
  id: string;
  number: string;
  total: number;
  created_at: string;
  status: string;
};

const EMPTY_FORM: CustomerForm = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

function customerToForm(customer: Customer): CustomerForm {
  return {
    name: customer.name,
    document: customer.document ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  };
}

function CustomerFormFields({
  form,
  onChange,
}: {
  form: CustomerForm;
  onChange: (next: CustomerForm) => void;
}) {
  return (
    <>
      <Input
        label={t('common.name')}
        icon="person-outline"
        value={form.name}
        onChangeText={(value) => onChange({ ...form, name: value })}
        autoCapitalize="words"
      />
      <Input
        label={t('common.document')}
        icon="card-outline"
        value={form.document}
        onChangeText={(value) => onChange({ ...form, document: value })}
      />
      <Input
        label={t('common.phone')}
        icon="call-outline"
        value={form.phone}
        onChangeText={(value) => onChange({ ...form, phone: value })}
        keyboardType="phone-pad"
      />
      <Input
        label={t('common.email')}
        icon="mail-outline"
        value={form.email}
        onChangeText={(value) => onChange({ ...form, email: value })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Input
        label={t('common.address')}
        icon="location-outline"
        value={form.address}
        onChangeText={(value) => onChange({ ...form, address: value })}
      />
      <Input
        label={t('common.notes')}
        icon="document-text-outline"
        value={form.notes}
        onChangeText={(value) => onChange({ ...form, notes: value })}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 88, paddingVertical: 12 }}
      />
    </>
  );
}

export default function Customers() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [data, setData] = useState<Page<Customer> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<
    'create' | 'edit' | 'detail' | 'movementTicket' | null
  >(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [amount, setAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState<{
    total_bought: number;
    purchases: number;
    last_purchase: string | null;
  } | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [creditAmount, setCreditAmount] = useState(0);
  const [lastMovement, setLastMovement] = useState<AccountEntry | null>(null);

  const load = useCallback(() => {
    if (user) {
      void customerService.page(search, page, 12).then(setData);
    }
  }, [user?.id, search, page]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal('create');
  }

  function openEdit(customer: Customer) {
    setSelected(customer);
    setForm(customerToForm(customer));
    setModal('edit');
  }

  async function saveCustomer() {
    if (!user || !form.name.trim()) return;

    const input = {
      name: form.name,
      document: form.document,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes,
    };

    try {
      if (modal === 'edit' && selected) {
        await customerService.update(user.id, selected.id, input);
        const fresh = await customerService.get(selected.id);
        setModal(null);
        load();
        if (fresh) await detail(fresh);
      } else {
        await customerService.create(user.id, input);
        setModal(null);
        setForm(EMPTY_FORM);
        load();
      }
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  async function detail(customer: Customer) {
    if (!user) return;

    setSelected(customer);
    const [nextBalance, nextStats, nextHistory, nextEntries] =
      await Promise.all([
        customerAccountService.balance(user.id, customer.id),
        customerService.stats(user.id, customer.id),
        customerService.history(user.id, customer.id),
        customerAccountService.entries(user.id, customer.id),
      ]);

    setBalance(nextBalance);
    setStats(nextStats);
    setHistory(nextHistory);
    setEntries(nextEntries);

    if (!wide) setModal('detail');
  }

  async function pay(method: PaymentMethod = 'CASH') {
    if (!user || !selected) return;

    try {
      const id = await customerAccountService.payment(
        user.id,
        selected.id,
        amount,
        method,
      );
      const movement = await customerAccountService.entry(user.id, id);
      setAmount(0);
      await detail(selected);

      if (movement) {
        setLastMovement(movement);
        setModal('movementTicket');
      }
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  async function addCredit() {
    if (!user || !selected) return;

    try {
      const id = await customerAccountService.addCredit(
        user.id,
        selected.id,
        creditAmount,
      );
      const movement = await customerAccountService.entry(user.id, id);
      setCreditAmount(0);
      await detail(selected);

      if (movement) {
        setLastMovement(movement);
        setModal('movementTicket');
      }
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  async function movementHtml() {
    if (!selected || !lastMovement) return '';
    const branding = await settingsService.receiptBranding();
    return accountMovementTicketHtml(
      {
        title:
          lastMovement.type === 'PAYMENT'
            ? t('premiumExtra.checkpoint12.customerPaymentTicket')
            : t('premiumExtra.checkpoint12.customerCreditTicket'),
        partyName: selected.name,
        movementType: lastMovement.type,
        amount: Math.abs(lastMovement.impact_minor),
        balance,
        createdAt: lastMovement.created_at,
        note: lastMovement.note,
      },
      branding,
      currency,
      locale,
    );
  }

  async function historyHtml() {
    if (!selected) return '';
    const branding = await settingsService.receiptBranding();
    return customerHistoryReportHtml(
      selected.name,
      history,
      branding,
      currency,
      locale,
    );
  }

  async function accountHtml() {
    if (!selected) return '';
    const branding = await settingsService.receiptBranding();
    return accountReportHtml(
      t('premiumExtra.checkpoint12.customerAccountReport'),
      selected.name,
      balance,
      entries,
      branding,
      currency,
      locale,
    );
  }

  async function printHtml(factory: () => Promise<string>) {
    try {
      const html = await factory();
      if (html) await printReceipt(html);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function shareHtml(
    factory: () => Promise<string>,
    fileName: string,
  ) {
    try {
      const html = await factory();
      if (html) await shareReceipt(html, fileName);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.shareFailed'));
    }
  }

  const Detail = () =>
    selected ? (
      <View style={{ gap: 12 }}>
        <Card>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <Avatar
              name={selected.name}
              tone={selected.active ? 'info' : 'danger'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  fontSize: 19,
                }}
              >
                {selected.name}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {selected.email ??
                  selected.phone ??
                  selected.document ??
                  t('premiumExtra.customers.noContactData')}
              </Text>
            </View>
            <Badge
              label={
                selected.active
                  ? t('common.active')
                  : t('common.inactive')
              }
              tone={selected.active ? 'success' : 'danger'}
            />
          </View>

          {has('CUSTOMERS_EDIT') ? (
            <Button
              fullWidth
              variant="ghost"
              icon="create-outline"
              label={t('common.edit')}
              onPress={() => openEdit(selected)}
            />
          ) : null}
        </Card>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Card style={{ flex: 1, minWidth: 135 }}>
            <Text style={{ color: th.colors.muted, fontSize: 11 }}>
              {t('customers.balance')}
            </Text>
            <Text
              style={{
                color:
                  balance > 0
                    ? th.colors.danger
                    : balance < 0
                      ? th.colors.success
                      : th.colors.heading,
                fontSize: 22,
                fontWeight: '900',
                marginTop: 4,
              }}
            >
              {formatMoney(balance, currency, locale)}
            </Text>
            <Badge
              label={
                balance > 0
                  ? t('customers.debt')
                  : balance < 0
                    ? t('customers.credit')
                    : t('premiumExtra.checkpoint12.upToDate')
              }
              tone={
                balance > 0
                  ? 'danger'
                  : balance < 0
                    ? 'success'
                    : 'neutral'
              }
            />
          </Card>

          <Card style={{ flex: 1, minWidth: 135 }}>
            <Text style={{ color: th.colors.muted, fontSize: 11 }}>
              {t('customers.totalBought')}
            </Text>
            <Text
              style={{
                color: th.colors.heading,
                fontSize: 20,
                fontWeight: '900',
                marginTop: 4,
              }}
            >
              {formatMoney(
                stats?.total_bought ?? 0,
                currency,
                locale,
              )}
            </Text>
            <Text style={{ color: th.colors.subtle, fontSize: 11 }}>
              {stats?.purchases ?? 0}
            </Text>
          </Card>
        </View>

        {has('CUSTOMER_CREDIT_MANAGE') ? (
          <Card variant="soft">
            <SectionTitle
              title={t('premium.customers.currentAccount')}
              subtitle={t('premium.customers.paymentsAndBalancesWithFullTraceability')}
            />
            <MoneyField
              label={t('customers.payment')}
              value={amount}
              onChangeMinor={setAmount}
            />
            <Button
              fullWidth
              icon="cash-outline"
              label={t('customers.payment')}
              disabled={amount <= 0}
              onPress={() => void pay('CASH')}
            />

            <MoneyField
              label={t('customers.credit')}
              value={creditAmount}
              onChangeMinor={setCreditAmount}
            />
            <Button
              fullWidth
              variant="ghost"
              icon="add-circle-outline"
              label={t('customers.credit')}
              disabled={creditAmount <= 0}
              onPress={() => void addCredit()}
            />
          </Card>
        ) : null}

        <Card>
          <SectionTitle
            title={t('customers.history')}
            subtitle={t('premium.customers.salesAssociatedWithTheCustomer')}
            right={
              history.length ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Button
                    compact
                    variant="ghost"
                    icon="print-outline"
                    label={t('sales.print')}
                    onPress={() => void printHtml(historyHtml)}
                  />
                </View>
              ) : undefined
            }
          />

          {history.length ? (
            history.slice(0, 10).map((row) => (
              <View
                key={row.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: th.colors.border,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: th.colors.text,
                      fontWeight: '800',
                    }}
                  >
                    {row.number}
                  </Text>
                  <Text
                    style={{
                      color: th.colors.subtle,
                      fontSize: 11,
                    }}
                  >
                    {new Date(row.created_at).toLocaleDateString()} ·{' '}
                    {row.status}
                  </Text>
                </View>
                <Text
                  style={{
                    color: th.colors.text,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(row.total, currency, locale)}
                </Text>
              </View>
            ))
          ) : (
            <Empty
              label={t('premium.customers.noPurchasesRecorded')}
              icon="receipt-outline"
            />
          )}
        </Card>

        <Card>
          <SectionTitle
            title={t('customers.account')}
            subtitle={t('premium.customers.reconstructableLedger')}
            right={
              entries.length ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Button
                    compact
                    variant="ghost"
                    icon="print-outline"
                    label={t('sales.print')}
                    onPress={() => void printHtml(accountHtml)}
                  />
                </View>
              ) : undefined
            }
          />

          {entries.length ? (
            entries.slice(0, 14).map((entry) => (
              <View
                key={entry.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 7,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: th.colors.text,
                      fontWeight: '800',
                      fontSize: 12,
                    }}
                  >
                    {entry.type}
                  </Text>
                  <Text
                    style={{
                      color: th.colors.subtle,
                      fontSize: 10,
                    }}
                  >
                    {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={{
                    color:
                      entry.impact_minor > 0
                        ? th.colors.danger
                        : th.colors.success,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(
                    entry.impact_minor,
                    currency,
                    locale,
                  )}
                </Text>
              </View>
            ))
          ) : (
            <Empty
              label={t('premium.customers.accountWithNoMovements')}
              icon="swap-horizontal-outline"
            />
          )}
        </Card>

        {has('CUSTOMERS_EDIT') ? (
          <Button
            variant="ghost"
            icon={
              selected.active
                ? 'pause-circle-outline'
                : 'play-circle-outline'
            }
            label={
              selected.active
                ? t('common.inactive')
                : t('common.active')
            }
            onPress={() =>
              void customerService
                .setActive(
                  user!.id,
                  selected.id,
                  !selected.active,
                )
                .then(() => {
                  load();
                  void detail({
                    ...selected,
                    active: selected.active ? 0 : 1,
                  });
                })
            }
          />
        ) : null}
      </View>
    ) : (
      <Empty
        label={t('premium.customers.selectACustomerToViewTheAccount')}
        icon="person-circle-outline"
      />
    );

  return (
    <Screen>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('premium.customers.customersPurchaseHistoryAndTraceableCurrentAccount')}
        eyebrow={t('premium.customers.milestone8Customers')}
        right={
          has('CUSTOMERS_EDIT') ? (
            <Button
              compact
              icon="person-add-outline"
              label={t('customers.new')}
              onPress={openCreate}
            />
          ) : undefined
        }
      />

      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1, width: '100%', gap: 10 }}>
          <SearchBar
            placeholder={t('premium.customers.searchCustomerDocumentOrContact')}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />

          {data?.items.length ? (
            data.items.map((customer) => (
              <Card
                key={customer.id}
                onPress={() => void detail(customer)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Avatar
                    name={customer.name}
                    tone={customer.active ? 'info' : 'danger'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: th.colors.text,
                        fontWeight: '900',
                        fontSize: 15,
                      }}
                    >
                      {customer.name}
                    </Text>
                    <Text
                      style={{
                        color: th.colors.muted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {customer.phone ??
                        customer.email ??
                        customer.document ??
                        t('premiumExtra.customers.noContact')}
                    </Text>
                  </View>
                  <Badge
                    label={
                      customer.active
                        ? t('common.active')
                        : t('common.inactive')
                    }
                    tone={customer.active ? 'success' : 'warning'}
                  />
                </View>
              </Card>
            ))
          ) : (
            <Empty
              label={t('premium.customers.noCustomersFound')}
              icon="people-outline"
            />
          )}

          {data ? (
            <Pager
              page={data.page}
              pages={data.pages}
              onChange={setPage}
            />
          ) : null}
        </View>

        {wide ? (
          <View style={{ flex: 1.35, width: '100%' }}>
            <Detail />
          </View>
        ) : null}
      </View>

      <ModalSheet
        visible={modal === 'create' || modal === 'edit'}
        title={
          modal === 'edit'
            ? t('common.edit')
            : t('customers.new')
        }
        onClose={() => setModal(null)}
      >
        <CustomerFormFields form={form} onChange={setForm} />
        <Button
          fullWidth
          icon="save-outline"
          label={
            modal === 'edit'
              ? t('common.save')
              : t('common.create')
          }
          disabled={!form.name.trim()}
          onPress={() => void saveCustomer()}
        />
      </ModalSheet>

      <ModalSheet
        visible={!wide && modal === 'detail'}
        title={selected?.name ?? t('customers.account')}
        onClose={() => setModal(null)}
      >
        <Detail />
      </ModalSheet>

      <ModalSheet
        visible={modal === 'movementTicket'}
        title={t('premiumExtra.checkpoint12.movementTicket')}
        onClose={() => setModal(null)}
      >
        {lastMovement && selected ? (
          <>
            <Card variant="soft">
              <SectionTitle
                title={selected.name}
                subtitle={lastMovement.type}
              />
              <Text
                style={{
                  color: th.colors.primary,
                  fontWeight: '900',
                  fontSize: 28,
                }}
              >
                {formatMoney(
                  Math.abs(lastMovement.impact_minor),
                  currency,
                  locale,
                )}
              </Text>
              <Text style={{ color: th.colors.muted }}>
                {t('customers.balance')}: {' '}
                {formatMoney(balance, currency, locale)}
              </Text>
            </Card>

            <Button
              fullWidth
              icon="print-outline"
              label={t('sales.print')}
              onPress={() => void printHtml(movementHtml)}
            />
          </>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}
