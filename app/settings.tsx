import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Text, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Currency, Locale, ThemeMode } from '@/core/types';
import { settingsService } from '@/modules/settings/service';
import { BusinessContactSettings } from '@/modules/settings/ui/BusinessContactSettings';
import { DenominationSettingsModal } from '@/modules/settings/ui/DenominationSettingsModal';
import {
  loadDemoData,
  purgeOperationalData,
} from '@/modules/settings/admin-data';
import { useSessionStore } from '@/stores/session';
import { usePreferencesStore } from '@/stores/preferences';
import { t } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalSheet,
  PageHeader,
  Screen,
  SectionTitle,
  Segmented,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

const MAOBITS_URL = 'https://www.maobits.com';
// The product currently has no dedicated course URL in project settings.
// Keep this as a single constant so the exact course URL can be replaced later.
const COURSE_URL = MAOBITS_URL;
const SERVICES_IMAGE = require('../assets/branding/servicios-maobits-final.jpg');

export default function Settings() {
  const th = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const locale = usePreferencesStore((s) => s.locale);
  const currency = usePreferencesStore((s) => s.currency);
  const theme = usePreferencesStore((s) => s.theme);

  const [adminModal, setAdminModal] =
    useState<'demo' | 'purge' | null>(null);
  const [pin, setPin] = useState('');
  const [phrase, setPhrase] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [creditsImageOpen, setCreditsImageOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [denominationsOpen, setDenominationsOpen] = useState(false);

  useEffect(() => {
    void settingsService.load().then((value) => {
      setBusinessName(value.businessName);
      setLogoUri(value.businessLogoUri ?? null);
    });
  }, []);

  const servicesImageWidth = Math.max(
    160,
    Math.min(520, windowWidth - 48),
  );
  const servicesImageHeight = Math.min(
    windowHeight * 0.58,
    servicesImageWidth * (1402 / 1122),
  );

  const expectedPhrase = useMemo(
    () =>
      adminModal === 'demo'
        ? 'CARGAR DATOS DEMO'
        : 'ELIMINAR TODOS LOS DATOS',
    [adminModal],
  );

  async function openUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      Alert.alert('MAOBITS POS', t('premiumExtra.checkpoint12.linkUnavailable'));
    }
  }

  async function changeLocale(value: Locale) {
    if (user) await settingsService.setLocale(user.id, value);
  }

  async function changeCurrency(value: Currency) {
    if (user) await settingsService.setCurrency(user.id, value);
  }

  async function changeTheme(value: ThemeMode) {
    if (user) await settingsService.setTheme(user.id, value);
  }

  async function pickLogo() {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;

    try {
      const next = await settingsService.setBusinessLogo(
        user.id,
        result.assets[0]!.uri,
      );
      setLogoUri(next);
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error ? t(error.message) : t('errors.unknown'),
      );
    }
  }

  async function removeLogo() {
    if (!user) return;
    await settingsService.setBusinessLogo(user.id, null);
    setLogoUri(null);
  }

  async function adminAction() {
    if (!user || !adminModal) return;

    const action = adminModal;

    try {
      if (action === 'demo') {
        await loadDemoData(
          user.id,
          pin,
          phrase,
        );
      } else {
        await purgeOperationalData(
          user.id,
          pin,
          phrase,
        );
      }

      const message =
        action === 'demo'
          ? t(
              'premiumExtra.checkpoint19.demoDataLoaded',
            )
          : t(
              'premiumExtra.checkpoint19.operationalDataDeleted',
            );

      setAdminModal(null);
      setPin('');
      setPhrase('');

      Alert.alert(
        'MAOBITS POS',
        message,
      );
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  const services = [
    'websiteDevelopment',
    'databaseSecurity',
    'mobileDevelopment',
    'seoOptimization',
    'corporateTraining',
    'digitalMarketing',
    'ecommerceStores',
    'technologyCourses',
  ] as const;

  return (
    <Screen>
      <PageHeader
        title={t('settings.title')}
        subtitle={t(
          'premium.settings.businessLanguageAppearanceAndProtectedAdministrativeOperations',
        )}
        eyebrow={t('premium.settings.milestone14Settings')}
      />

      <Card>
        <SectionTitle
          title={t('settings.business')}
          subtitle={t('premium.settings.informationShownOnReceiptsAndOperations')}
        />

        <Card variant="soft">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                resizeMode="contain"
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 18,
                  backgroundColor: th.colors.surface,
                }}
              />
            ) : (
              <View
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 18,
                  backgroundColor: th.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: th.colors.primary,
                    fontWeight: '900',
                    fontSize: 20,
                  }}
                >
                  MB
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ color: th.colors.heading, fontWeight: '900' }}>
                {t('premiumExtra.checkpoint11.businessLogo')}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 17,
                }}
              >
                {t('premiumExtra.checkpoint11.logoHelp')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              compact
              variant="secondary"
              icon="image-outline"
              label={t('premiumExtra.checkpoint11.selectLogo')}
              onPress={pickLogo}
            />
            {logoUri ? (
              <Button
                compact
                variant="ghost"
                icon="trash-outline"
                label={t('premiumExtra.checkpoint11.removeLogo')}
                onPress={removeLogo}
              />
            ) : null}
          </View>
        </Card>

        <Input
          label={t('settings.businessName')}
          icon="storefront-outline"
          value={businessName}
          onChangeText={setBusinessName}
        />
        <Button
          icon="save-outline"
          label={t('common.save')}
          onPress={() => {
            if (user) {
              void settingsService
                .setBusinessName(user.id, businessName)
                .then(() =>
                  Alert.alert(
                    'MAOBITS POS',
                    t('premiumExtra.checkpoint11.saved'),
                  ),
                );
            }
          }}
        />
        {user && has('SETTINGS_MANAGE') ? (
          <BusinessContactSettings
            actorId={user.id}
          />
        ) : null}

      </Card>

      <Card>
        <SectionTitle title={t('premium.settings.interfacePreferences')} />
        <Text
          style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}
        >
          {t('settings.language')}
        </Text>
        <Segmented
          options={[
            { label: '🇨🇴 Español', value: 'es' },
            { label: '🇺🇸 English', value: 'en' },
          ]}
          value={locale}
          onChange={(value) => void changeLocale(value as Locale)}
        />

        <Text
          style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}
        >
          {t('settings.currency')}
        </Text>
        <Segmented
          options={(['COP', 'USD', 'EUR'] as Currency[]).map((value) => ({
            label: value,
            value,
          }))}
          value={currency}
          onChange={(value) => void changeCurrency(value as Currency)}
        />

        <Card variant="soft">
          <SectionTitle
            title={t(
              'premiumExtra.checkpoint17.cashDenominations',
            )}
            subtitle={t(
              'premiumExtra.checkpoint17.settingsHelp',
            )}
            right={
              <Button
                compact
                variant="secondary"
                icon="cash-outline"
                label={t(
                  'premiumExtra.checkpoint17.configure',
                )}
                onPress={() =>
                  setDenominationsOpen(true)
                }
              />
            }
          />
          <Badge
            label={`${currency} · ${t(
              'premiumExtra.checkpoint17.activeCurrency',
            )}`}
            tone="info"
            icon="wallet-outline"
          />
        </Card>

        <Text
          style={{ color: th.colors.muted, fontWeight: '800', fontSize: 12 }}
        >
          {t('settings.theme')}
        </Text>
        <Segmented
          options={[
            { label: t('settings.light'), value: 'light' },
            { label: t('settings.dark'), value: 'dark' },
            { label: t('settings.system'), value: 'system' },
          ]}
          value={theme}
          onChange={(value) => void changeTheme(value as ThemeMode)}
        />
      </Card>

      <Card variant="warning">
        <SectionTitle
          title={t('premium.settings.protectedOperations')}
          subtitle={t(
            'premium.settings.requireAdministratorPinAndExactConfirmationPhrase',
          )}
        />
        <Badge
          label={t('premium.settings.neverExecutedSilently')}
          tone="warning"
          icon="warning-outline"
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="flask-outline"
            label={t('settings.loadDemo')}
            onPress={() => {
              setPin('');
              setPhrase('');
              setAdminModal('demo');
            }}
          />
          <Button
            variant="danger"
            icon="trash-outline"
            label={t('settings.purge')}
            onPress={() => {
              setPin('');
              setPhrase('');
              setAdminModal('purge');
            }}
          />
        </View>
      </Card>

      <Card variant="soft" onPress={() => setCreditsImageOpen(true)}>
        <SectionTitle
          title={t('premium.settings.credits')}
          subtitle={t('premiumExtra.checkpoint12.tapCreditsImage')}
        />

        <Text
          style={{
            color: th.colors.heading,
            fontWeight: '900',
            fontSize: 18,
          }}
        >
          MAOBITS POS
        </Text>
        <Text style={{ color: th.colors.muted }}>Versión 1.0.0</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Text style={{ color: th.colors.text, fontWeight: '800', flex: 1 }}>
            Instituto Maobits S.A.S.
          </Text>
          <Button
            compact
            variant="secondary"
            icon="school-outline"
            label={t('premiumExtra.checkpoint12.accessCourse')}
            onPress={() => void openUrl(COURSE_URL)}
          />
        </View>

        <Text style={{ color: th.colors.muted }}>NIT 902010335-7</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Button
            compact
            variant="ghost"
            icon="globe-outline"
            label="By Maobits · www.maobits.com"
            onPress={() => void openUrl(MAOBITS_URL)}
          />
          <Button
            compact
            variant="ghost"
            icon="list-outline"
            label={t('premiumExtra.checkpoint12.viewServices')}
            onPress={() => setServicesOpen(true)}
          />
        </View>

        <Text style={{ color: th.colors.muted }}>
          Email: admin@moabits.com
        </Text>
      </Card>

      {user ? (
        <DenominationSettingsModal
          visible={denominationsOpen}
          actorId={user.id}
          initialCurrency={currency}
          onClose={() =>
            setDenominationsOpen(false)
          }
        />
      ) : null}

      <ModalSheet
        visible={Boolean(adminModal)}
        title={
          adminModal === 'demo'
            ? t('settings.loadDemo')
            : t('settings.purge')
        }
        onClose={() => setAdminModal(null)}
      >
        <Card variant="warning">
          <Text
            style={{
              color: th.colors.muted,
              fontSize: 12,
              fontWeight: '800',
            }}
          >
            {t('premiumExtra.checkpoint11.confirmationPhrase')}
          </Text>
          <Text
            selectable
            style={{
              color: th.colors.heading,
              fontSize: 16,
              fontWeight: '900',
              marginTop: 8,
              fontFamily: 'monospace',
            }}
          >
            {expectedPhrase}
          </Text>
        </Card>
        <Input
          label={t('settings.adminPin')}
          value={pin}
          onChangeText={(value) =>
            setPin(value.replace(/\D/g, '').slice(0, 4))
          }
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <Input
          label={t('settings.phrase')}
          value={phrase}
          onChangeText={setPhrase}
        />
        <Button
          fullWidth
          icon="checkmark-circle-outline"
          label={t('common.confirm')}
          variant={adminModal === 'purge' ? 'danger' : 'primary'}
          disabled={pin.length !== 4 || phrase !== expectedPhrase}
          onPress={adminAction}
        />
      </ModalSheet>

      <ModalSheet
        visible={creditsImageOpen}
        title={t('premiumExtra.checkpoint12.maobitsServicesImage')}
        onClose={() => setCreditsImageOpen(false)}
      >
        <Image
          source={SERVICES_IMAGE}
          resizeMode="contain"
          style={{
            width: servicesImageWidth,
            height: servicesImageHeight,
            alignSelf: 'center',
            borderRadius: 20,
            backgroundColor: th.colors.surfaceAlt,
          }}
        />
      </ModalSheet>

      <ModalSheet
        visible={servicesOpen}
        title={t('premiumExtra.checkpoint12.servicesTitle')}
        onClose={() => setServicesOpen(false)}
      >
        <Card variant="soft">
          <SectionTitle
            title="MAOBITS"
            subtitle={t('premiumExtra.checkpoint12.servicesTagline')}
          />
          {services.map((service, index) => (
            <View
              key={service}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                paddingVertical: 10,
                borderBottomWidth: index === services.length - 1 ? 0 : 1,
                borderBottomColor: th.colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: th.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: th.colors.primary, fontWeight: '900' }}>
                  {index + 1}
                </Text>
              </View>
              <Text style={{ color: th.colors.text, fontWeight: '800', flex: 1 }}>
                {t(`premiumExtra.checkpoint12.services.${service}`)}
              </Text>
            </View>
          ))}
        </Card>

        <Button
          fullWidth
          icon="globe-outline"
          label="www.maobits.com"
          onPress={() => void openUrl(MAOBITS_URL)}
        />
      </ModalSheet>
    </Screen>
  );
}
