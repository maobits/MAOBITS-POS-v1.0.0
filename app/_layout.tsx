import 'react-native-reanimated';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function RootLayout() {
  const th = useAppTheme();
  return (
    <>
      <StatusBar style={th.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: th.colors.surface },
          headerTintColor: th.colors.text,
          contentStyle: { backgroundColor: th.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout', presentation: 'card' }} />
        <Stack.Screen name="scanner" options={{ title: 'Scanner', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
