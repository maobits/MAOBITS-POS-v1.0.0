import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { Currency } from '@/core/types';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  cashDenominationService,
  parseDenominationAmount,
  type CashDenominations,
} from '@/modules/settings/cash-denominations';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalSheet,
  SectionTitle,
  Segmented,
} from '@/shared/ui';
import { usePreferencesStore } from '@/stores/preferences';
import { useAppTheme } from '@/core/theme/useAppTheme';

function emptyConfig(): CashDenominations {
  return { coins: [], bills: [] };
}

export function DenominationSettingsModal({
  visible,
  actorId,
  initialCurrency,
  onClose,
}: {
  visible: boolean;
  actorId: string;
  initialCurrency: Currency;
  onClose: () => void;
}) {
  const th = useAppTheme();
  const locale = usePreferencesStore((s) => s.locale);
  const [currency, setCurrency] =
    useState<Currency>(initialCurrency);
  const [config, setConfig] =
    useState<CashDenominations>(emptyConfig());
  const [coinInput, setCoinInput] = useState('');
  const [billInput, setBillInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(target: Currency) {
    setConfig(await cashDenominationService.get(target));
    setCoinInput('');
    setBillInput('');
  }

  useEffect(() => {
    if (!visible) return;
    setCurrency(initialCurrency);
    void load(initialCurrency);
  }, [visible, initialCurrency]);

  async function selectCurrency(value: string) {
    const next = value as Currency;
    setCurrency(next);
    await load(next);
  }

  function add(
    kind: keyof CashDenominations,
    raw: string,
  ) {
    const amount = parseDenominationAmount(raw, currency);
    if (amount <= 0) return;

    setConfig((current) => ({
      ...current,
      [kind]: Array.from(
        new Set([...current[kind], amount]),
      ).sort((a, b) => a - b),
    }));

    if (kind === 'coins') setCoinInput('');
    else setBillInput('');
  }

  function remove(
    kind: keyof CashDenominations,
    amount: number,
  ) {
    setConfig((current) => ({
      ...current,
      [kind]: current[kind].filter(
        (value) => value !== amount,
      ),
    }));
  }

  async function save() {
    try {
      setBusy(true);
      const saved = await cashDenominationService.set(
        actorId,
        currency,
        config,
      );
      setConfig(saved);
      Alert.alert(
        'MAOBITS POS',
        t('premiumExtra.checkpoint17.saved'),
      );
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    try {
      setBusy(true);
      const defaults = await cashDenominationService.reset(
        actorId,
        currency,
      );
      setConfig(defaults);
      Alert.alert(
        'MAOBITS POS',
        t('premiumExtra.checkpoint17.defaultsRestored'),
      );
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    } finally {
      setBusy(false);
    }
  }

  function list(
    kind: keyof CashDenominations,
    title: string,
    input: string,
    setInput: (value: string) => void,
  ) {
    return (
      <Card variant="soft">
        <SectionTitle
          title={title}
          subtitle={`${config[kind].length} ${t(
            'premiumExtra.checkpoint17.denominations',
          )}`}
        />

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {config[kind].map((amount) => (
            <View
              key={`${kind}-${amount}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: th.colors.border,
                backgroundColor: th.colors.surface,
                borderRadius: 14,
                paddingVertical: 7,
                paddingLeft: 10,
                paddingRight: 6,
              }}
            >
              <Text
                style={{
                  color: th.colors.text,
                  fontWeight: '900',
                }}
              >
                {formatMoney(amount, currency, locale)}
              </Text>
              <Button
                compact
                variant="ghost"
                icon="close"
                label={t(
                  'premiumExtra.checkpoint17.removeDenomination',
                )}
                onPress={() => remove(kind, amount)}
              />
            </View>
          ))}
        </View>

        <Input
          label={t(
            'premiumExtra.checkpoint17.newDenomination',
          )}
          value={input}
          onChangeText={setInput}
          keyboardType={
            currency === 'COP'
              ? 'number-pad'
              : 'decimal-pad'
          }
          placeholder={
            currency === 'COP'
              ? '5000'
              : '5.00'
          }
        />

        <Button
          compact
          variant="secondary"
          icon="add"
          label={t(
            'premiumExtra.checkpoint17.addDenomination',
          )}
          disabled={
            parseDenominationAmount(
              input,
              currency,
            ) <= 0
          }
          onPress={() => add(kind, input)}
        />
      </Card>
    );
  }

  return (
    <ModalSheet
      visible={visible}
      title={t(
        'premiumExtra.checkpoint17.cashDenominations',
      )}
      onClose={onClose}
    >
      <Card>
        <SectionTitle
          title={t('settings.currency')}
          subtitle={t(
            'premiumExtra.checkpoint17.currencyHelp',
          )}
        />
        <Segmented
          options={(['COP', 'USD', 'EUR'] as Currency[]).map(
            (value) => ({
              label: value,
              value,
            }),
          )}
          value={currency}
          onChange={(value) => void selectCurrency(value)}
        />
        <Badge
          label={t(
            'premiumExtra.checkpoint17.minorUnitsHelp',
          )}
          tone="info"
          icon="information-circle-outline"
        />
      </Card>

      {list(
        'coins',
        t('premiumExtra.checkpoint17.coins'),
        coinInput,
        setCoinInput,
      )}

      {list(
        'bills',
        t('premiumExtra.checkpoint17.banknotes'),
        billInput,
        setBillInput,
      )}

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="ghost"
          icon="refresh-outline"
          label={t(
            'premiumExtra.checkpoint17.restoreDefaults',
          )}
          disabled={busy}
          onPress={() => void reset()}
        />
        <Button
          icon="save-outline"
          label={t('common.save')}
          disabled={
            busy ||
            !config.coins.length ||
            !config.bills.length
          }
          onPress={() => void save()}
        />
      </View>
    </ModalSheet>
  );
}
