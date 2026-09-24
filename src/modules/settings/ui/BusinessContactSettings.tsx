import React, {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  View,
} from 'react-native';
import { t } from '@/core/i18n';
import { businessContactService } from '@/modules/settings/business-contact';
import {
  Button,
  Input,
  SectionTitle,
} from '@/shared/ui';

export function BusinessContactSettings({
  actorId,
}: {
  actorId: string;
}) {
  const [email, setEmail] =
    useState('');
  const [phone, setPhone] =
    useState('');
  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    void businessContactService
      .get()
      .then((value) => {
        setEmail(value.email);
        setPhone(value.phone);
      });
  }, []);

  async function save() {
    try {
      setBusy(true);

      const saved =
        await businessContactService.set(
          actorId,
          { email, phone },
        );

      setEmail(saved.email);
      setPhone(saved.phone);

      Alert.alert(
        'MAOBITS POS',
        t(
          'premiumExtra.checkpoint20.businessContactSaved',
        ),
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

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle
        title={t(
          'premiumExtra.checkpoint20.businessContact',
        )}
        subtitle={t(
          'premiumExtra.checkpoint20.businessContactHelp',
        )}
      />

      <Input
        label={t(
          'premiumExtra.checkpoint20.businessEmail',
        )}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="ventas@negocio.com"
      />

      <Input
        label={t(
          'premiumExtra.checkpoint20.businessPhone',
        )}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+57 315 377 4638"
      />

      <Button
        compact
        variant="secondary"
        icon="save-outline"
        label={t('common.save')}
        disabled={busy}
        onPress={() => void save()}
      />
    </View>
  );
}
