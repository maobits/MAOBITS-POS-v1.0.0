import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { productService } from '@/modules/products/service';
import { useCartStore } from '@/stores/cart';
import { t } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Screen,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Scanner() {
  const th = useAppTheme();
  const [permission, request] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const add = useCartStore((s) => s.add);
  const player = useAudioPlayer(require('../assets/audio/scan-beep.wav'));

  async function scanned(value: string) {
    if (locked) return;
    setLocked(true);

    const product = await productService.byBarcode(value);

    if (!product) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
      Alert.alert(
        'MAOBITS POS',
        t('scanner.notFound'),
        [{ text: 'OK', onPress: () => setLocked(false) }],
      );
      return;
    }

    add({
      productId: product.id,
      name: product.name,
      unitPrice: product.sale_price,
      taxRateBp: product.tax_rate_bp,
      imageUri: product.featured_image_uri,
    });

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      // Haptic and visual confirmation remain available if audio fails.
    }

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    );

    setMessage(
      t('premiumExtra.checkpoint12.productScannedAdded', {
        name: product.name,
      }),
    );

    setTimeout(() => {
      router.back();
    }, 800);
  }

  if (!permission?.granted) {
    return (
      <Screen>
        <PageHeader
          title={t('scanner.title')}
          subtitle={t('premium.scanner.theCameraIsUsedOnlyToScan')}
          eyebrow={t('premium.scanner.milestone9Scanner')}
        />
        <Card>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: th.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="camera-outline"
              size={30}
              color={th.colors.primary}
            />
          </View>
          <Text style={{ color: th.colors.muted, lineHeight: 20 }}>
            {t('scanner.permission')}
          </Text>
          <Button
            fullWidth
            icon="camera-outline"
            label={t('scanner.grant')}
            onPress={() => void request()}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'qr'],
        }}
        onBarcodeScanned={(event) => void scanned(event.data)}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 34,
          right: 34,
          top: '29%',
          height: 210,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          borderRadius: 26,
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          top: 50,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Badge
          label={
            locked
              ? t('premiumExtra.scanner.processing')
              : t('premiumExtra.scanner.alignCode')
          }
          tone="info"
          icon="barcode-outline"
        />

        {message ? (
          <Card
            variant="soft"
            style={{
              maxWidth: 420,
              width: '100%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={th.colors.success}
              />
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  flex: 1,
                }}
              >
                {message}
              </Text>
            </View>
          </Card>
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 40,
        }}
      >
        <Button
          fullWidth
          variant="dark"
          icon="close"
          label={t('common.close')}
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}
