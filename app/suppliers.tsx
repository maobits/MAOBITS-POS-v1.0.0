import React, { useCallback, useState } from 'react';
import { Alert, Image, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { Page, PaymentMethod, Supplier } from '@/core/types';
import { supplierService } from '@/modules/suppliers/service';
import { supplierAccountService } from '@/modules/supplier-account/service';
import { settingsService } from '@/modules/settings/service';
import {
  accountMovementTicketHtml,
  accountReportHtml,
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

type SupplierEntry = {
  id: string;
  type: string;
  impact_minor: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

type SupplierHistory = {
  id: string;
  number: string;
  total: number;
  created_at: string;
};

export default function Suppliers() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [data, setData] = useState<Page<Supplier> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<
    'edit' | 'detail' | 'movementTicket' | null
  >(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<SupplierEntry[]>([]);
  const [history, setHistory] = useState<SupplierHistory[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [lastMovement, setLastMovement] = useState<SupplierEntry | null>(null);

  const load = useCallback(() => {
    if (!user || !has('SUPPLIERS_VIEW')) return;
    void supplierService
      .page(user.id, search, page, 12, true)
      .then(setData);
  }, [user?.id, search, page, has]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openEdit(supplier?: Supplier) {
    if (!has('SUPPLIERS_EDIT')) return;

    setSelected(supplier ?? null);
    setForm({
      name: supplier?.name ?? '',
      document: supplier?.document ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      notes: supplier?.notes ?? '',
    });
    setPendingLogo(null);
    setModal('edit');
  }

  async function detail(supplier: Supplier) {
    if (!user) return;
    setSelected(supplier);

    const [nextBalance, nextEntries, nextHistory] = await Promise.all([
      supplierAccountService.balance(user.id, supplier.id),
      supplierAccountService.entries(user.id, supplier.id),
      supplierService.history(supplier.id),
    ]);

    setBalance(nextBalance);
    setEntries(nextEntries);
    setHistory(nextHistory);

    if (!wide) setModal('detail');
  }

  async function save() {
    if (!user || !has('SUPPLIERS_EDIT')) return;

    try {
      let id = selected?.id ?? null;

      if (selected) {
        await supplierService.update(user.id, selected.id, form);
      } else {
        id = await supplierService.create(user.id, form);
      }

      if (id && pendingLogo) {
        await supplierService.setLogo(user.id, id, pendingLogo);
      }

      setModal(null);
      setPendingLogo(null);
      load();
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  async function pickLogo() {
    if (!has('SUPPLIERS_EDIT')) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      setPendingLogo(result.assets[0]!.uri);
    }
  }

  async function removeLogo() {
    if (!user || !selected || !has('SUPPLIERS_EDIT')) {
      setPendingLogo(null);
      return;
    }

    await supplierService.setLogo(user.id, selected.id, null);
    setPendingLogo(null);
    setSelected({ ...selected, logo_uri: null });
    load();
  }

  async function pay(method: PaymentMethod = 'CASH') {
    if (!user || !selected) return;

    try {
      const id = await supplierAccountService.payment(
        user.id,
        selected.id,
        paymentAmount,
        method,
      );
      setPaymentAmount(0);
      await detail(selected);

      const movement = (
        await supplierAccountService.entries(user.id, selected.id)
      ).find((entry) => entry.id === id);

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
      const id = await supplierAccountService.addCredit(
        user.id,
        selected.id,
        creditAmount,
      );
      setCreditAmount(0);
      await detail(selected);

      const movement = (
        await supplierAccountService.entries(user.id, selected.id)
      ).find((entry) => entry.id === id);

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

  async function accountHtml() {
    if (!selected) return '';
    const branding = await settingsService.receiptBranding();
    return accountReportHtml(
      t('premiumExtra.checkpoint12.supplierAccountReport'),
      selected.name,
      balance,
      entries,
      branding,
      currency,
      locale,
    );
  }

  async function movementHtml() {
    if (!selected || !lastMovement) return '';
    const branding = await settingsService.receiptBranding();
    return accountMovementTicketHtml(
      {
        title: t('premiumExtra.checkpoint12.supplierMovementTicket'),
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

  async function printHtml(factory: () => Promise<string>) {
    try {
      const html = await factory();
      if (html) await printReceipt(html);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint11.pdfFailed'));
    }
  }

  async function shareHtml(factory: () => Promise<string>, name: string) {
    try {
      const html = await factory();
      if (html) await shareReceipt(html, name);
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
              alignItems: 'center',
              gap: 12,
            }}
          >
            {selected.logo_uri ? (
              <Image
                source={{ uri: selected.logo_uri }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: th.colors.surfaceAlt,
                }}
              />
            ) : (
              <Avatar name={selected.name} tone="info" />
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  fontSize: 18,
                }}
              >
                {selected.name}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {selected.document ??
                  selected.phone ??
                  selected.email ??
                  t('premiumExtra.suppliers.noContact')}
              </Text>
            </View>

            <Badge
              label={
                selected.active
                  ? t('common.active')
                  : t('common.inactive')
              }
              tone={selected.active ? 'success' : 'warning'}
            />
          </View>

          {has('SUPPLIERS_EDIT') ? (
            <Button
              fullWidth
              variant="ghost"
              icon="create-outline"
              label={t('common.edit')}
              onPress={() => openEdit(selected)}
            />
          ) : null}
        </Card>

        <Card
          variant="soft"
          style={{
            borderColor:
              balance > 0
                ? th.colors.danger
                : balance < 0
                  ? th.colors.success
                  : th.colors.border,
            backgroundColor:
              balance > 0
                ? th.colors.dangerSoft
                : balance < 0
                  ? th.colors.successSoft
                  : th.colors.surfaceAlt,
          }}
        >
          <Text style={{ color: th.colors.muted, fontSize: 11 }}>
            {t('premiumExtra.checkpoint12.supplierBalance')}
          </Text>
          <Text
            style={{
              color:
                balance > 0
                  ? th.colors.danger
                  : balance < 0
                    ? th.colors.success
                    : th.colors.heading,
              fontWeight: '900',
              fontSize: 27,
            }}
          >
            {formatMoney(balance, currency, locale)}
          </Text>
          <Badge
            label={
              balance > 0
                ? t('premiumExtra.checkpoint12.weOweSupplier')
                : balance < 0
                  ? t('premiumExtra.checkpoint12.supplierCredit')
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

        {has('SUPPLIERS_EDIT') ? (
          <Card variant="soft">
            <SectionTitle
              title={t('premiumExtra.checkpoint12.supplierCurrentAccount')}
            />
            <MoneyField
              label={t('premiumExtra.checkpoint12.paySupplier')}
              value={paymentAmount}
              onChangeMinor={setPaymentAmount}
            />
            <Button
              fullWidth
              icon="cash-outline"
              label={t('premiumExtra.checkpoint12.paySupplier')}
              disabled={paymentAmount <= 0}
              onPress={() => void pay('CASH')}
            />

            <MoneyField
              label={t('premiumExtra.checkpoint12.supplierCredit')}
              value={creditAmount}
              onChangeMinor={setCreditAmount}
            />
            <Button
              fullWidth
              variant="ghost"
              icon="add-circle-outline"
              label={t('premiumExtra.checkpoint12.supplierCredit')}
              disabled={creditAmount <= 0}
              onPress={addCredit}
            />
          </Card>
        ) : null}

        <Card>
          <SectionTitle
            title={t('premiumExtra.checkpoint12.purchaseHistory')}
            subtitle={`${history.length}`}
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
                  <Text style={{ color: th.colors.subtle, fontSize: 11 }}>
                    {new Date(row.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={{
                    color: th.colors.heading,
                    fontWeight: '900',
                  }}
                >
                  {formatMoney(row.total, currency, locale)}
                </Text>
              </View>
            ))
          ) : (
            <Empty
              label={t('premiumExtra.checkpoint12.noPurchases')}
              icon="bag-handle-outline"
            />
          )}
        </Card>

        <Card>
          <SectionTitle
            title={t('premiumExtra.checkpoint12.supplierCurrentAccount')}
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
                  <Text style={{ color: th.colors.subtle, fontSize: 10 }}>
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
              label={t('premiumExtra.checkpoint12.noAccountMovements')}
              icon="swap-horizontal-outline"
            />
          )}
        </Card>
      </View>
    ) : (
      <Empty
        label={t('premiumExtra.checkpoint12.selectSupplier')}
        icon="business-outline"
      />
    );

  return (
    <Screen>
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('premium.suppliers.supplyDirectoryConnectedToProductsAndPurchases')}
        eyebrow={t('premium.suppliers.milestone5Suppliers')}
        right={
          has('SUPPLIERS_EDIT') ? (
            <Button
              compact
              icon="add"
              label={t('suppliers.new')}
              onPress={() => openEdit()}
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
            placeholder={t('premium.suppliers.searchSupplierTaxIdOrContact')}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />

          {data?.items.length ? (
            data.items.map((supplier) => (
              <Card
                key={supplier.id}
                onPress={() => void detail(supplier)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {supplier.logo_uri ? (
                    <Image
                      source={{ uri: supplier.logo_uri }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: th.colors.surfaceAlt,
                      }}
                    />
                  ) : (
                    <Avatar
                      name={supplier.name}
                      tone={supplier.active ? 'info' : 'danger'}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: th.colors.heading,
                        fontWeight: '900',
                        fontSize: 16,
                      }}
                    >
                      {supplier.name}
                    </Text>
                    <Text
                      style={{
                        color: th.colors.muted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {supplier.document ??
                        t('premiumExtra.suppliers.noDocument')}{' '}
                      ·{' '}
                      {supplier.phone ??
                        supplier.email ??
                        t('premiumExtra.suppliers.noContact')}
                    </Text>
                  </View>

                  <Badge
                    label={
                      supplier.active
                        ? t('common.active')
                        : t('common.inactive')
                    }
                    tone={supplier.active ? 'success' : 'warning'}
                  />
                </View>
              </Card>
            ))
          ) : (
            <Empty
              label={t('premium.suppliers.noSuppliersYet')}
              icon="business-outline"
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
          <View style={{ flex: 1.2, width: '100%' }}>
            <Detail />
          </View>
        ) : null}
      </View>

      <ModalSheet
        visible={modal === 'edit'}
        title={selected ? t('common.edit') : t('suppliers.new')}
        onClose={() => setModal(null)}
      >
        <Card variant="soft">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {pendingLogo || selected?.logo_uri ? (
              <Image
                source={{ uri: pendingLogo ?? selected!.logo_uri! }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: th.colors.surfaceAlt,
                }}
              />
            ) : (
              <Avatar name={form.name || 'P'} tone="info" />
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                }}
              >
                {t('premium.suppliers.logoAvatar')}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {t('premium.suppliers.copiedToLocalAppStorageAndIncluded')}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Button
              compact
              variant="secondary"
              icon="image-outline"
              label={t('premium.suppliers.selectImage')}
              onPress={pickLogo}
            />
            {pendingLogo || selected?.logo_uri ? (
              <Button
                compact
                variant="ghost"
                icon="trash-outline"
                label={t('premium.suppliers.remove')}
                onPress={() => void removeLogo()}
              />
            ) : null}
          </View>
        </Card>

        <Input
          label={t('common.name')}
          icon="business-outline"
          value={form.name}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, name: value }))
          }
        />
        <Input
          label={t('common.document')}
          value={form.document}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, document: value }))
          }
        />
        <Input
          label={t('common.phone')}
          icon="call-outline"
          value={form.phone}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, phone: value }))
          }
        />
        <Input
          label={t('common.email')}
          icon="mail-outline"
          value={form.email}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, email: value }))
          }
          keyboardType="email-address"
        />
        <Input
          label={t('common.address')}
          icon="location-outline"
          value={form.address}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, address: value }))
          }
        />
        <Input
          label={t('common.notes')}
          value={form.notes}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, notes: value }))
          }
          multiline
        />
        <Button
          fullWidth
          icon="save-outline"
          label={t('common.save')}
          disabled={!form.name.trim()}
          onPress={save}
        />
      </ModalSheet>

      <ModalSheet
        visible={!wide && modal === 'detail'}
        title={selected?.name ?? t('suppliers.title')}
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
                {t('premiumExtra.checkpoint12.supplierBalance')}: {' '}
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
