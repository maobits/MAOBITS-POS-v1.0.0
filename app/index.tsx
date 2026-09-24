import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { bootstrapApp } from '@/core/bootstrap/service';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { t } from '@/core/i18n';

export default function Index() {
  const th = useAppTheme();
  const [status, setStatus] = useState('Inicializando SQLite…');

  useEffect(() => {
    void (async () => {
      setStatus('Verificando estructura local…');
      const s = await bootstrapApp();
      setStatus('Preparando MAOBITS POS…');
      setTimeout(() => router.replace(s.configured ? '/login' : '/setup'), 500);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.primary, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ width: 104, height: 104, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Ionicons name="phone-portrait-outline" size={50} color={th.colors.primary} />
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -1 }}>{t('premium.index.maobitsPos')}</Text>
      <Text style={{ color: '#C7D2FE', marginTop: 8, fontWeight: '800' }}>{t('premium.index.professionalLocalFirstV100')}</Text>
      <View style={{ marginTop: 54, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color="#FFFFFF" />
        <Text style={{ color: '#E0E7FF', fontSize: 13 }}>{status}</Text>
      </View>
    </View>
  );
}
