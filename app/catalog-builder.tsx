import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  type Href,
  useLocalSearchParams,
} from 'expo-router';
import type { Currency } from '@/core/types';
import { formatMoney } from '@/core/money';
import { t } from '@/core/i18n';
import { offerService } from '@/modules/offers/service';
import { catalogPrintService } from '@/modules/offers/catalog-print';
import { usePreferencesStore } from '@/stores/preferences';
import { useSessionStore } from '@/stores/session';
import {
  Badge,
  Button,
  Card,
  DatePickerField,
  Input,
  PageHeader,
  Screen,
  SearchBar,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

function todayYmd() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function plusDaysYmd(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function percentToBp(value: string) {
  const parsed = Number.parseFloat(
    value.trim().replace(',', '.'),
  );
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(
    0,
    Math.min(10000, Math.round(parsed * 100)),
  );
}

function bpToPercent(bp: number) {
  const value = bp / 100;
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2);
}

function discountedPrice(
  price: number,
  discountBp: number,
) {
  return Math.max(
    0,
    price -
      Math.round(
        price * discountBp / 10000,
      ),
  );
}

type CategoryIcon =
  keyof typeof Ionicons.glyphMap;

function categoryIcon(value: string): CategoryIcon {
  return Object.prototype.hasOwnProperty.call(
    Ionicons.glyphMap,
    value,
  )
    ? value as CategoryIcon
    : 'grid-outline';
}

export default function CatalogBuilder() {
  const th = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const user = useSessionStore((s) => s.user);
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [products, setProducts] = useState<
    {
      id: string;
      name: string;
      description: string;
      category_id: string | null;
      category_name: string | null;
      sale_price: number;
      featured_image_uri: string | null;
    }[]
  >([]);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [notes, setNotes] = useState('');
  const [validFrom, setValidFrom] = useState(todayYmd());
  const [validUntil, setValidUntil] =
    useState(plusDaysYmd(30));
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);
  const [categoryDiscounts, setCategoryDiscounts] =
    useState<Record<string, string>>({});
  const [productDiscounts, setProductDiscounts] =
    useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      try {
        const data =
          await offerService.builderData(user.id);
        setCategories(data.categories);
        setProducts(data.products);

        if (params.id) {
          const offer = await offerService.detail(
            user.id,
            params.id,
          );

          setName(offer.name);
          setSubtitle(offer.subtitle ?? '');
          setNotes(offer.notes ?? '');
          setValidFrom(
            offer.valid_from.slice(0, 10),
          );
          setValidUntil(
            offer.valid_until.slice(0, 10),
          );
          setSelectedCategories(
            offer.categoryRules.map(
              (rule) => rule.category_id,
            ),
          );

          setCategoryDiscounts(
            Object.fromEntries(
              offer.categoryRules.map((rule) => [
                rule.category_id,
                bpToPercent(rule.discount_bp),
              ]),
            ),
          );

          setProductDiscounts(
            Object.fromEntries(
              offer.productRules.map((rule) => [
                rule.product_id,
                bpToPercent(rule.discount_bp),
              ]),
            ),
          );
        }
      } catch (error) {
        Alert.alert(
          'MAOBITS POS',
          error instanceof Error
            ? t(error.message)
            : t('errors.unknown'),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, params.id]);

  const selectedProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.category_id &&
          selectedCategories.includes(
            product.category_id,
          ) &&
          (
            !search.trim() ||
            product.name
              .toLowerCase()
              .includes(
                search.trim().toLowerCase(),
              ) ||
            (product.category_name ?? '')
              .toLowerCase()
              .includes(
                search.trim().toLowerCase(),
              )
          ),
      ),
    [
      products,
      selectedCategories,
      search,
    ],
  );

  function toggleCategory(id: string) {
    setSelectedCategories((current) =>
      current.includes(id)
        ? current.filter(
            (value) => value !== id,
          )
        : [...current, id],
    );
  }

  async function save(
    printAfter = false,
  ) {
    if (!user) return;

    if (
      !name.trim() ||
      !selectedCategories.length
    ) {
      Alert.alert(
        'MAOBITS POS',
        t(
          'premiumExtra.checkpoint18.catalogValidation',
        ),
      );
      return;
    }

    try {
      setBusy(true);

      const id = await offerService.save(
        user.id,
        {
          id: params.id,
          name,
          subtitle,
          notes,
          currency:
            currency as Currency,
          validFrom:
            `${validFrom}T00:00:00`,
          validUntil:
            `${validUntil}T23:59:59`,
          categories:
            selectedCategories.map(
              (categoryId) => ({
                categoryId,
                discountBp:
                  percentToBp(
                    categoryDiscounts[
                      categoryId
                    ] ?? '',
                  ),
              }),
            ),
          products:
            Object.entries(
              productDiscounts,
            )
              .filter(
                ([, value]) =>
                  value.trim() !== '',
              )
              .map(
                ([productId, value]) => ({
                  productId,
                  discountBp:
                    percentToBp(value),
                }),
              ),
        },
      );

      if (printAfter) {
        await catalogPrintService.print(
          user.id,
          id,
          locale,
        );
        Alert.alert(
          'MAOBITS POS',
          t(
            'premiumExtra.checkpoint18.catalogPrinted',
          ),
        );
      } else {
        Alert.alert(
          'MAOBITS POS',
          t(
            'premiumExtra.checkpoint18.catalogSaved',
          ),
        );
      }

      router.replace(
        '/offers' as Href,
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

  if (loading) {
    return (
      <Screen>
        <PageHeader
          title={t(
            'premiumExtra.checkpoint18.catalogBuilder',
          )}
        />
        <Badge
          label={t('common.loading')}
          tone="info"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={t(
          'premiumExtra.checkpoint18.catalogBuilder',
        )}
        subtitle={t(
          'premiumExtra.checkpoint18.catalogBuilderHelp',
        )}
        eyebrow={t(
          'premiumExtra.checkpoint18.promotionalCatalog',
        )}
      />

      <Card>
        <SectionTitle
          title={t(
            'premiumExtra.checkpoint18.catalogIdentity',
          )}
        />
        <Input
          label={t(
            'premiumExtra.checkpoint18.catalogName',
          )}
          value={name}
          onChangeText={setName}
          placeholder={t(
            'premiumExtra.checkpoint18.catalogNameExample',
          )}
        />
        <Input
          label={t(
            'premiumExtra.checkpoint18.catalogSubtitle',
          )}
          value={subtitle}
          onChangeText={setSubtitle}
        />
        <Input
          label={t('common.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 160,
            }}
          >
            <DatePickerField
              label={t(
                'premiumExtra.checkpoint18.validFrom',
              )}
              value={validFrom}
              onChange={setValidFrom}
            />
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 160,
            }}
          >
            <DatePickerField
              label={t(
                'premiumExtra.checkpoint18.validUntil',
              )}
              value={validUntil}
              onChange={setValidUntil}
            />
          </View>
        </View>

        <Badge
          label={`${currency} · ${t(
            'premiumExtra.checkpoint18.currentSalePrices',
          )}`}
          tone="info"
          icon="pricetag-outline"
        />
      </Card>

      <Card>
        <SectionTitle
          title={t(
            'premiumExtra.checkpoint18.chooseCategories',
          )}
          subtitle={t(
            'premiumExtra.checkpoint18.chooseCategoriesHelp',
          )}
        />

        {categories.map(
          (category) => {
            const selected =
              selectedCategories.includes(
                category.id,
              );
            const categoryDiscount =
              categoryDiscounts[
                category.id
              ] ?? '';

            return (
              <Card
                key={category.id}
                variant={
                  selected
                    ? 'primary'
                    : 'soft'
                }
                onPress={() =>
                  toggleCategory(category.id)
                }
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Ionicons
                    name={categoryIcon(
                      category.icon,
                    )}
                    size={24}
                    color={
                      selected
                        ? '#FFFFFF'
                        : th.colors.primary
                    }
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: selected
                          ? '#FFFFFF'
                          : th.colors.heading,
                        fontWeight: '900',
                        fontSize: 15,
                      }}
                    >
                      {category.name}
                    </Text>

                    {selected ? (
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: '800',
                          marginTop: 3,
                        }}
                      >
                        {t(
                          'premiumExtra.checkpoint18.categoryDiscount',
                        )}: {categoryDiscount || '0'}%
                      </Text>
                    ) : null}
                  </View>

                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color="#FFFFFF"
                    />
                  ) : null}
                </View>

                {selected ? (
                  <View
                    style={{
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontWeight: '900',
                        fontSize: 12,
                      }}
                    >
                      {t(
                        'premiumExtra.checkpoint19.categoryDiscountInput',
                      )}
                    </Text>

                    <TextInput
                      value={
                        categoryDiscount
                      }
                      onChangeText={(value) =>
                        setCategoryDiscounts(
                          (current) => ({
                            ...current,
                            [category.id]:
                              value,
                          }),
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="10"
                      placeholderTextColor="#64748B"
                      accessibilityLabel={t(
                        'premiumExtra.checkpoint19.categoryDiscountInput',
                      )}
                      style={{
                        minHeight: 48,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor:
                          '#E2E8F0',
                        backgroundColor:
                          '#FFFFFF',
                        color: '#111827',
                        paddingHorizontal: 14,
                        fontSize: 16,
                        fontWeight: '900',
                      }}
                    />
                  </View>
                ) : null}
              </Card>
            );
          },
        )}
      </Card>

      {selectedCategories.length ? (
        <Card>
          <SectionTitle
            title={t(
              'premiumExtra.checkpoint18.productOverrides',
            )}
            subtitle={t(
              'premiumExtra.checkpoint19.priorityHelp',
            )}
          />

          <Badge
            label={t(
              'premiumExtra.checkpoint19.priorityRule',
            )}
            tone="info"
            icon="information-circle-outline"
          />

          <SearchBar
            placeholder={t(
              'premiumExtra.checkpoint18.searchCatalogProduct',
            )}
            value={search}
            onChangeText={setSearch}
          />

          {selectedCategories.map((categoryId) => {
            const category = categories.find(
              (item) => item.id === categoryId,
            );
            const categoryProducts =
              selectedProducts.filter(
                (product) =>
                  product.category_id === categoryId,
              );

            if (!categoryProducts.length) {
              return null;
            }

            return (
              <View
                key={categoryId}
                style={{ gap: 10 }}
              >
                <SectionTitle
                  title={
                    category?.name ??
                    t(
                      'premiumExtra.checkpoint20.otherCategory',
                    )
                  }
                  subtitle={`${categoryProducts.length} ${t(
                    'premiumExtra.checkpoint20.productsInCategory',
                  )}`}
                />

                {categoryProducts.map(
                  (product) => {
              const categoryDiscount =
                categoryDiscounts[
                  product.category_id ?? ''
                ] ?? '';

              const productOverride =
                productDiscounts[
                  product.id
                ];

              const hasProductOverride =
                typeof productOverride ===
                  'string' &&
                productOverride.trim() !== '';

              const effectiveDiscountBp =
                hasProductOverride
                  ? percentToBp(
                      productOverride,
                    )
                  : percentToBp(
                      categoryDiscount,
                    );

              const finalPrice =
                discountedPrice(
                  product.sale_price,
                  effectiveDiscountBp,
                );

              return (
                <Card
                  key={product.id}
                  variant="soft"
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    {product.featured_image_uri ? (
                      <Image
                        source={{
                          uri:
                            product.featured_image_uri,
                        }}
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 16,
                          backgroundColor:
                            th.colors.surfaceAlt,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 16,
                          backgroundColor:
                            th.colors.surfaceAlt,
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                        }}
                      >
                        <Ionicons
                          name="image-outline"
                          size={28}
                          color={
                            th.colors.muted
                          }
                        />
                      </View>
                    )}

                    <View
                      style={{
                        flex: 1,
                        gap: 5,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            th.colors.heading,
                          fontWeight: '900',
                          fontSize: 15,
                        }}
                      >
                        {product.name}
                      </Text>

                      <Badge
                        label={`${t(
                          'premiumExtra.checkpoint20.categoryLabel',
                        )}: ${
                          product.category_name ??
                          t(
                            'premiumExtra.checkpoint20.otherCategory',
                          )
                        }`}
                        tone="info"
                        icon="folder-outline"
                      />

                      <View
                        style={{
                          gap: 2,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              th.colors.muted,
                            fontSize: 11,
                          }}
                        >
                          {t(
                            'premiumExtra.checkpoint19.priceBefore',
                          )}:{' '}
                          {formatMoney(
                            product.sale_price,
                            currency,
                            locale,
                          )}
                        </Text>

                        <Text
                          style={{
                            color:
                              th.colors.primary,
                            fontWeight: '900',
                            fontSize: 16,
                          }}
                        >
                          {t(
                            'premiumExtra.checkpoint19.priceAfter',
                          )}:{' '}
                          {formatMoney(
                            finalPrice,
                            currency,
                            locale,
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Badge
                    label={
                      hasProductOverride
                        ? `${t(
                            'premiumExtra.checkpoint19.productPriority',
                          )} · ${
                            effectiveDiscountBp /
                            100
                          }%`
                        : `${t(
                            'premiumExtra.checkpoint19.categoryApplied',
                          )} · ${
                            effectiveDiscountBp /
                            100
                          }%`
                    }
                    tone={
                      hasProductOverride
                        ? 'success'
                        : 'info'
                    }
                    icon={
                      hasProductOverride
                        ? 'flash-outline'
                        : 'layers-outline'
                    }
                  />

                  <Input
                    label={t(
                      'premiumExtra.checkpoint18.productDiscountOverride',
                    )}
                    value={
                      productDiscounts[
                        product.id
                      ] ?? ''
                    }
                    onChangeText={(value) =>
                      setProductDiscounts(
                        (current) => ({
                          ...current,
                          [product.id]:
                            value,
                        }),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder={t(
                      'premiumExtra.checkpoint18.inheritCategory',
                    )}
                  />
                </Card>
              );
                  },
                )}
              </View>
            );
          })}
        </Card>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button
          icon="save-outline"
          label={t('common.save')}
          disabled={
            busy ||
            !name.trim() ||
            !selectedCategories.length
          }
          onPress={() =>
            void save(false)
          }
        />
        <Button
          variant="secondary"
          icon="print-outline"
          label={t(
            'premiumExtra.checkpoint18.printCatalog',
          )}
          disabled={
            busy ||
            !name.trim() ||
            !selectedCategories.length
          }
          onPress={() =>
            void save(true)
          }
        />
      </View>
    </Screen>
  );
}
