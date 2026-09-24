import React, { useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { configureFirstRun } from '@/core/bootstrap/service';
import { setLocale, t } from '@/core/i18n';
import type { Currency, Locale, ThemeMode } from '@/core/types';
import { Badge, Button, Card, Input, PageHeader, Screen, Segmented } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Setup() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const [business, setBusiness] = useState('');
  const [admin, setAdmin] = useState('');
  const [pin, setPin] = useState('');
  const [locale, setLoc] = useState<Locale>('es');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  setLocale(locale);

  async function save() {
    try {
      setBusy(true);
      await configureFirstRun({ businessName: business, currency, locale, theme, adminName: admin, adminPin: pin });
      router.replace('/login');
    } catch (e) {
      Alert.alert('MAOBITS POS', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { title: t('premiumExtra.setup.yourBusiness'), subtitle: t('premiumExtra.setup.businessIdentity'), icon: 'storefront-outline' as const },
    { title: t('premiumExtra.setup.administrator'), subtitle: t('premiumExtra.setup.firstProtectedAccess'), icon: 'shield-checkmark-outline' as const },
    { title: t('premiumExtra.setup.preferences'), subtitle: t('premiumExtra.setup.languageCurrencyAppearance'), icon: 'options-outline' as const },
  ];

  return (
    <Screen>
      <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <PageHeader title={t('premium.setup.configureMaobitsPos')} subtitle={t('premium.setup.threeStepsToGetYourApplicationReady')} eyebrow={t('premium.setup.firstRun')} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          {steps.map((s, i) => <View key={s.title} style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: i <= step ? th.colors.primary : th.colors.border }} />)}
        </View>

        <Card style={{ padding: width > 700 ? 26 : 18 }}>
          <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: th.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={steps[step]!.icon} size={26} color={th.colors.primary} />
          </View>
          <View>
            <Text style={{ color: th.colors.heading, fontSize: 22, fontWeight: '900' }}>{steps[step]!.title}</Text>
            <Text style={{ color: th.colors.muted, marginTop: 4 }}>{steps[step]!.subtitle}</Text>
          </View>

          {step === 0 ? (
            <Input label={t('auth.business')} icon="storefront-outline" value={business} onChangeText={setBusiness} placeholder={t('premium.setup.eGMaobitsCafe')} />
          ) : null}

          {step === 1 ? (
            <>
              <Input label={t('auth.adminName')} icon="person-outline" value={admin} onChangeText={setAdmin} placeholder={t('premium.setup.administratorName')} />
              <Input label={t('auth.adminPin')} icon="keypad-outline" value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} hint={t('premium.setup.between4And8DigitsStoredSecurely')} />
              <Badge label={t('premium.setup.pinProtectedWithSaltHashNeverStored')} tone="success" icon="lock-closed-outline" />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}>{t('settings.language')}</Text>
              <Segmented options={[{ label: '🇨🇴 Español', value: 'es' }, { label: '🇺🇸 English', value: 'en' }]} value={locale} onChange={(v) => setLoc(v as Locale)} />
              <Text style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}>{t('settings.currency')}</Text>
              <Segmented options={(['COP','USD','EUR'] as Currency[]).map((v) => ({ label: v, value: v }))} value={currency} onChange={(v) => setCurrency(v as Currency)} />
              <Text style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}>{t('settings.theme')}</Text>
              <Segmented options={[{ label: t('premiumExtra.setup.light'), value: 'light' }, { label: t('premiumExtra.setup.dark'), value: 'dark' }, { label: t('premiumExtra.setup.system'), value: 'system' }]} value={theme} onChange={(v) => setTheme(v as ThemeMode)} />
            </>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 4 }}>
            {step > 0 ? <Button variant="ghost" icon="arrow-back" label={t('common.previous')} onPress={() => setStep((s) => s - 1)} /> : <View />}
            {step < 2 ? (
              <Button icon="arrow-forward" label={t('common.next')} disabled={(step === 0 && !business.trim()) || (step === 1 && (!admin.trim() || pin.length !== 4))} onPress={() => setStep((s) => s + 1)} />
            ) : (
              <Button icon="checkmark-circle-outline" label={t('auth.finish')} disabled={busy || !business.trim() || !admin.trim() || pin.length !== 4} onPress={save} />
            )}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
