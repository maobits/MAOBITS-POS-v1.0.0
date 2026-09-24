import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { t } from '@/core/i18n';
import { Avatar, Badge, Button, Card, PageHeader, Screen } from '@/shared/ui';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { useAppTheme } from '@/core/theme/useAppTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const entries: {
  route: Href;
  label: string;
  permission: string;
  icon: IconName;
  subtitle: string;
}[] = [
  { route: '/products', label: 'nav.products', permission: 'PRODUCTS_VIEW', icon: 'pricetags-outline', subtitle: 'premiumExtra.more.catalogImagesEan' },
  { route: '/categories', label: 'nav.categories', permission: 'PRODUCTS_VIEW', icon: 'grid-outline', subtitle: 'premiumExtra.more.organizationReports' },
  { route: '/suppliers', label: 'nav.suppliers', permission: 'SUPPLIERS_VIEW', icon: 'business-outline', subtitle: 'premiumExtra.more.suppliersPurchases' },
  { route: '/purchases', label: 'nav.purchases', permission: 'PURCHASES_VIEW', icon: 'bag-handle-outline', subtitle: 'premiumExtra.checkpoint12.purchasesModuleSubtitle' },
  { route: '/sales', label: 'nav.sales', permission: 'SALES_VIEW', icon: 'receipt-outline', subtitle: 'premiumExtra.more.historyFiltersReversal' },
  { route: '/cash', label: 'nav.cash', permission: 'CASH_OPEN_CLOSE', icon: 'cash-outline', subtitle: 'premiumExtra.more.openMovementsClose' },
  { route: '/reports', label: 'nav.reports', permission: 'REPORTS_VIEW', icon: 'bar-chart-outline', subtitle: 'premiumExtra.more.realLocalAnalytics' },
  { route: '/offers', label: 'premiumExtra.checkpoint21.offersMenu', permission: 'CATALOG_PRINT', icon: 'pricetags-outline', subtitle: 'premiumExtra.checkpoint21.offersMenuHelp' },
  { route: '/users', label: 'nav.users', permission: 'USERS_MANAGE', icon: 'people-circle-outline', subtitle: 'premiumExtra.more.usersAccess' },
  { route: '/roles', label: 'nav.roles', permission: 'USERS_MANAGE', icon: 'shield-checkmark-outline', subtitle: 'premiumExtra.more.rolesPermissions' },
  { route: '/backup', label: 'nav.backup', permission: 'BACKUP_MANAGE', icon: 'cloud-download-outline', subtitle: 'premiumExtra.more.dataMedia' },
  { route: '/settings', label: 'nav.settings', permission: 'SETTINGS_MANAGE', icon: 'settings-outline', subtitle: 'premiumExtra.more.businessLanguageSecurity' },
];

export default function More() {
  const th = useAppTheme();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const setUser = useSessionStore((s) => s.setUser);
  const locale = usePreferencesStore((s) => s.locale);

  return (
    <Screen>
      <PageHeader
        title={t('nav.more')}
        subtitle={t('premium.more.administrativeToolsOrganizedByModule')}
        eyebrow={t('premium.more.maobitsPosModules')}
      />

      <Card variant="soft">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user?.name ?? 'MAOBITS'} tone="success" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.colors.heading, fontWeight: '900' }}>
              {user?.name}
            </Text>
            <Text style={{ color: th.colors.muted, fontSize: 12, marginTop: 2 }}>
              {user?.roleName}
            </Text>
          </View>
          <Badge
            label={t('premium.more.localFirst')}
            tone="success"
            icon="shield-checkmark-outline"
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {entries
          .filter((entry) => has(entry.permission))
          .map((entry) => (
            <View
              key={`${locale}-${String(entry.route)}`}
              style={{ width: '48%', minWidth: 160, flexGrow: 1 }}
            >
              <Card
                onPress={() => router.push(entry.route)}
                accessibilityLabel={t(entry.label)}
                style={{ minHeight: 145 }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 15,
                    backgroundColor: th.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={entry.icon} size={23} color={th.colors.primary} />
                </View>
                <Text
                  style={{
                    color: th.colors.heading,
                    fontWeight: '900',
                    fontSize: 16,
                  }}
                >
                  {t(entry.label)}
                </Text>
                <Text
                  style={{
                    color: th.colors.muted,
                    fontSize: 12,
                    lineHeight: 17,
                  }}
                >
                  {t(entry.subtitle)}
                </Text>
              </Card>
            </View>
          ))}
      </View>

      <Button
        fullWidth
        variant="danger"
        icon="log-out-outline"
        label={t('auth.logout')}
        onPress={() => {
          setUser(null);
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
