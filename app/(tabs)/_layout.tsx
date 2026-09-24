import React, { useEffect, useState } from 'react';
import { type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { inventoryService } from '@/modules/inventory/service';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { useSessionStore } from '@/stores/session';
import { useCartStore } from '@/stores/cart';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

const icon = (name: IconName) =>
  ({ color, size }: TabIconProps) => <Ionicons name={name} color={color} size={size} />;

export default function TabLayout() {
  const th = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const cartUnits = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (!user || !has('INVENTORY_VIEW')) {
      setLowStockCount(0);
      return;
    }
    void inventoryService.alertCount(user.id).then(setLowStockCount).catch(() => setLowStockCount(0));
  }, [user?.id, pathname, has]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: th.colors.background },
        headerTintColor: th.colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '900' },
        tabBarStyle: {
          backgroundColor: th.colors.surface,
          borderTopColor: th.colors.border,
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: th.colors.primary,
        tabBarInactiveTintColor: th.colors.subtle,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t('nav.dashboard'), tabBarIcon: icon('grid-outline'), href: has('DASHBOARD_VIEW') ? undefined : null }} />
      <Tabs.Screen name="pos" options={{ title: t('nav.pos'), tabBarIcon: icon('cart-outline'), tabBarBadge: cartUnits > 0 ? (cartUnits > 99 ? '99+' : cartUnits) : undefined, href: has('POS_SELL') ? undefined : null }} />
      <Tabs.Screen name="inventory" options={{ title: t('nav.inventory'), tabBarIcon: icon('cube-outline'), tabBarBadge: lowStockCount > 0 ? (lowStockCount > 99 ? '99+' : lowStockCount) : undefined, tabBarBadgeStyle: { backgroundColor: th.colors.danger, color: '#FFFFFF' }, href: has('INVENTORY_VIEW') ? undefined : null }} />
      <Tabs.Screen name="customers" options={{ title: t('nav.customers'), tabBarIcon: icon('people-outline'), href: has('CUSTOMERS_VIEW') ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: t('nav.more'), tabBarIcon: icon('apps-outline') }} />
    </Tabs>
  );
}
