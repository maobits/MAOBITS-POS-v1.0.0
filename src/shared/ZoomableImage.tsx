import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/core/i18n';

export function ZoomableImage({
  uri,
  style,
  resizeMode = 'cover',
}: {
  uri: string;
  style?: React.ComponentProps<typeof Image>['style'];
  resizeMode?: React.ComponentProps<typeof Image>['resizeMode'];
}) {
  const [open, setOpen] = useState(false);
  const { width, height } =
    useWindowDimensions();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          'premiumExtra.checkpoint24.expandImage',
        )}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          style as never,
          {
            position: 'relative',
            overflow: 'hidden',
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
        />

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor:
              'rgba(15,23,42,0.78)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="expand-outline"
            size={20}
            color="#FFFFFF"
          />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setOpen(false)
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'premiumExtra.checkpoint24.closeImage',
          )}
          onPress={() =>
            setOpen(false)
          }
          style={{
            flex: 1,
            backgroundColor:
              'rgba(2,6,23,0.96)',
          }}
        >
          <SafeAreaView
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
            }}
          >
            <Pressable
              onPress={(event) =>
                event.stopPropagation()
              }
              style={{
                width: Math.max(
                  1,
                  width - 24,
                ),
                height: Math.max(
                  1,
                  height - 120,
                ),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={{ uri }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                'premiumExtra.checkpoint24.closeImage',
              )}
              onPress={() =>
                setOpen(false)
              }
              hitSlop={12}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 14,
                right: 14,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  'rgba(255,255,255,0.16)',
                borderWidth: 1,
                borderColor:
                  'rgba(255,255,255,0.30)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity:
                  pressed ? 0.72 : 1,
              })}
            >
              <Ionicons
                name="close"
                size={28}
                color="#FFFFFF"
              />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}
