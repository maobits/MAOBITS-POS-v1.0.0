import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  router,
  type Href,
  useFocusEffect,
} from 'expo-router';
import { t } from '@/core/i18n';
import { offerService } from '@/modules/offers/service';
import { catalogPrintService } from '@/modules/offers/catalog-print';
import { usePreferencesStore } from '@/stores/preferences';
import { useSessionStore } from '@/stores/session';
import {
  Badge,
  Button,
  Card,
  Empty,
  PageHeader,
  Screen,
  SearchBar,
  SectionTitle,
  Segmented,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

type Filter = 'all' | 'current' | 'expired';

export default function Offers() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const locale = usePreferencesStore((s) => s.locale);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof offerService.list>>
  >([]);
  const [filter, setFilter] =
    useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] =
    useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    void offerService.list(user.id).then(setRows);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const expired =
        new Date(row.valid_until).getTime() < now;
      const current =
        row.active &&
        Boolean(row.printed_at) &&
        !expired &&
        new Date(row.valid_from).getTime() <= now;

      if (filter === 'current' && !current) return false;
      if (filter === 'expired' && !expired) return false;

      return (
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.subtitle ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  async function print(id: string) {
    if (!user) return;

    try {
      setBusyId(id);
      await catalogPrintService.print(
        user.id,
        id,
        locale,
      );
      await offerService.list(user.id).then(setRows);
      Alert.alert(
        'MAOBITS POS',
        t('premiumExtra.checkpoint18.catalogPrinted'),
      );
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(
    id: string,
    active: boolean,
  ) {
    if (!user) return;
    await offerService.setActive(
      user.id,
      id,
      active,
    );
    load();
  }

  return (
    <Screen>
      <PageHeader
        title={t(
          'premiumExtra.checkpoint18.offersCatalogs',
        )}
        subtitle={t(
          'premiumExtra.checkpoint18.offersCatalogsHelp',
        )}
        eyebrow={t(
          'premiumExtra.checkpoint18.configurationModule',
        )}
        right={
          <Button
            compact
            icon="add"
            label={t(
              'premiumExtra.checkpoint18.newCatalog',
            )}
            onPress={() =>
              router.push('/catalog-builder' as Href)
            }
          />
        }
      />

      <SearchBar
        placeholder={t(
          'premiumExtra.checkpoint18.searchCatalog',
        )}
        value={search}
        onChangeText={setSearch}
      />

      <Segmented
        options={[
          {
            label: t('common.all'),
            value: 'all',
          },
          {
            label: t(
              'premiumExtra.checkpoint18.currentOffers',
            ),
            value: 'current',
          },
          {
            label: t(
              'premiumExtra.checkpoint18.expiredOffers',
            ),
            value: 'expired',
          },
        ]}
        value={filter}
        onChange={(value) =>
          setFilter(value as Filter)
        }
      />

      {filtered.length ? (
        filtered.map((row) => {
          const expired =
            new Date(row.valid_until).getTime() <
            Date.now();

          const current =
            row.active &&
            Boolean(row.printed_at) &&
            !expired &&
            new Date(row.valid_from).getTime() <=
              Date.now();

          return (
            <Card key={row.id}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: th.colors.heading,
                      fontWeight: '900',
                      fontSize: 17,
                    }}
                  >
                    {row.name}
                  </Text>
                  {row.subtitle ? (
                    <Text
                      style={{
                        color: th.colors.muted,
                        marginTop: 3,
                      }}
                    >
                      {row.subtitle}
                    </Text>
                  ) : null}
                </View>

                <Badge
                  label={
                    current
                      ? t(
                          'premiumExtra.checkpoint18.current',
                        )
                      : expired
                        ? t(
                            'premiumExtra.checkpoint18.expired',
                          )
                        : row.printed_at
                          ? t(
                              'premiumExtra.checkpoint18.inactive',
                            )
                          : t(
                              'premiumExtra.checkpoint18.pendingPrint',
                            )
                  }
                  tone={
                    current
                      ? 'success'
                      : expired
                        ? 'warning'
                        : 'neutral'
                  }
                />
              </View>

              <Card variant="soft">
                <SectionTitle
                  title={t(
                    'premiumExtra.checkpoint18.catalogVersion',
                  )}
                  subtitle={`${row.currency} · ${new Date(
                    row.valid_until,
                  ).toLocaleDateString()}`}
                />
                <Text
                  style={{
                    color: th.colors.muted,
                    lineHeight: 18,
                  }}
                >
                  {row.categories}{' '}
                  {t(
                    'premiumExtra.checkpoint18.categories',
                  )}
                  {' · '}
                  {row.product_rules}{' '}
                  {t(
                    'premiumExtra.checkpoint18.productOverridesShort',
                  )}
                  {' · '}
                  {row.snapshot_items}{' '}
                  {t(
                    'premiumExtra.checkpoint18.printedProducts',
                  )}
                </Text>

                {row.notes ? (
                  <Text
                    style={{
                      color: th.colors.text,
                      marginTop: 7,
                    }}
                  >
                    {row.notes}
                  </Text>
                ) : null}
              </Card>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  compact
                  variant="ghost"
                  icon="create-outline"
                  label={t('common.edit')}
                  onPress={() =>
                    router.push(
                      {
                        pathname:
                          '/catalog-builder',
                        params: { id: row.id },
                      } as Href,
                    )
                  }
                />
                <Button
                  compact
                  variant="secondary"
                  icon="print-outline"
                  label={t(
                    'premiumExtra.checkpoint18.printCatalog',
                  )}
                  disabled={busyId === row.id}
                  onPress={() => void print(row.id)}
                />
                <Button
                  compact
                  variant="ghost"
                  icon={
                    row.active
                      ? 'pause-circle-outline'
                      : 'play-circle-outline'
                  }
                  label={
                    row.active
                      ? t('common.inactive')
                      : t('common.active')
                  }
                  onPress={() =>
                    void toggle(
                      row.id,
                      !row.active,
                    )
                  }
                />
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          label={t(
            'premiumExtra.checkpoint18.noCatalogs',
          )}
          icon="albums-outline"
        />
      )}
    </Screen>
  );
}
