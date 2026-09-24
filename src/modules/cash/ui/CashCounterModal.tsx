import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { Currency, Locale } from '@/core/types';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import {
  cashDenominationService,
  type CashDenominations,
} from '@/modules/settings/cash-denominations';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalSheet,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

type Counts = Record<string, number>;

function countKey(kind: 'coin' | 'bill', value: number) {
  return `${kind}:${value}`;
}

export function CashCounterModal({
  visible,
  currency,
  locale,
  onClose,
  onApply,
}: {
  visible: boolean;
  currency: Currency;
  locale: Locale;
  onClose: () => void;
  onApply: (total: number) => void;
}) {
  const th = useAppTheme();
  const [config, setConfig] =
    useState<CashDenominations>({
      coins: [],
      bills: [],
    });
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    if (!visible) return;

    setCounts({});
    void cashDenominationService
      .get(currency)
      .then(setConfig);
  }, [visible, currency]);

  const total = useMemo(() => {
    let sum = 0;

    for (const value of config.coins) {
      sum += value * (counts[countKey('coin', value)] ?? 0);
    }

    for (const value of config.bills) {
      sum += value * (counts[countKey('bill', value)] ?? 0);
    }

    return sum;
  }, [config, counts]);

  function setCount(
    kind: 'coin' | 'bill',
    denomination: number,
    raw: string | number,
  ) {
    const parsed =
      typeof raw === 'number'
        ? raw
        : Number.parseInt(
            raw.replace(/\D/g, ''),
            10,
          );

    const quantity = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed))
      : 0;

    setCounts((current) => ({
      ...current,
      [countKey(kind, denomination)]: quantity,
    }));
  }

  function row(
    kind: 'coin' | 'bill',
    denomination: number,
  ) {
    const key = countKey(kind, denomination);
    const quantity = counts[key] ?? 0;
    const subtotal = denomination * quantity;

    return (
      <View
        key={key}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: th.colors.border,
          paddingVertical: 9,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: th.colors.heading,
                fontWeight: '900',
                fontSize: 15,
              }}
            >
              {formatMoney(
                denomination,
                currency,
                locale,
              )}
            </Text>
            <Text
              style={{
                color: th.colors.muted,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {t(
                'premiumExtra.checkpoint17.subtotal',
              )}:{' '}
              {formatMoney(
                subtotal,
                currency,
                locale,
              )}
            </Text>
          </View>

          <Button
            compact
            variant="ghost"
            icon="remove"
            label={t(
              'premiumExtra.checkpoint17.decrease',
            )}
            disabled={quantity <= 0}
            onPress={() =>
              setCount(
                kind,
                denomination,
                quantity - 1,
              )
            }
          />

          <View style={{ width: 74 }}>
            <Input
              value={String(quantity)}
              onChangeText={(value) =>
                setCount(
                  kind,
                  denomination,
                  value,
                )
              }
              keyboardType="number-pad"
              selectTextOnFocus
              style={{
                textAlign: 'center',
                fontWeight: '900',
              }}
            />
          </View>

          <Button
            compact
            variant="secondary"
            icon="add"
            label={t(
              'premiumExtra.checkpoint17.increase',
            )}
            onPress={() =>
              setCount(
                kind,
                denomination,
                quantity + 1,
              )
            }
          />
        </View>
      </View>
    );
  }

  return (
    <ModalSheet
      visible={visible}
      title={t(
        'premiumExtra.checkpoint17.cashCounter',
      )}
      onClose={onClose}
    >
      <Card variant="primary">
        <Text
          style={{
            color: '#C7D2FE',
            fontWeight: '800',
            fontSize: 12,
          }}
        >
          {t(
            'premiumExtra.checkpoint17.countedTotal',
          )}
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '900',
            marginTop: 3,
          }}
        >
          {formatMoney(total, currency, locale)}
        </Text>
        <Text
          style={{
            color: '#C7D2FE',
            fontSize: 11,
            marginTop: 5,
          }}
        >
          {currency}
        </Text>
      </Card>

      <Card>
        <SectionTitle
          title={t(
            'premiumExtra.checkpoint17.countCoins',
          )}
          subtitle={t(
            'premiumExtra.checkpoint17.enterQuantities',
          )}
        />
        {config.coins.map((value) =>
          row('coin', value),
        )}
      </Card>

      <Card>
        <SectionTitle
          title={t(
            'premiumExtra.checkpoint17.countBanknotes',
          )}
          subtitle={t(
            'premiumExtra.checkpoint17.enterQuantities',
          )}
        />
        {config.bills.map((value) =>
          row('bill', value),
        )}
      </Card>

      <Badge
        label={t(
          'premiumExtra.checkpoint17.counterHelp',
        )}
        tone="info"
        icon="calculator-outline"
      />

      <Button
        fullWidth
        variant="success"
        icon="checkmark-circle-outline"
        label={`${t(
          'premiumExtra.checkpoint17.applyCount',
        )} · ${formatMoney(
          total,
          currency,
          locale,
        )}`}
        onPress={() => {
          onApply(total);
          onClose();
        }}
      />
    </ModalSheet>
  );
}
