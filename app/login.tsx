import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { authService } from '@/modules/auth/service';
import { t } from '@/core/i18n';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Loader,
  Screen,
} from '@/shared/ui';
import { useSessionStore } from '@/stores/session';
import { useAppTheme } from '@/core/theme/useAppTheme';

interface UserChoice {
  id: string;
  name: string;
  role_name: string;
  avatar_uri: string | null;
}

export default function Login() {
  const th = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 720;
  const setUser = useSessionStore(
    (s) => s.setUser,
  );

  const [users, setUsers] = useState<
    UserChoice[]
  >([]);
  const [selected, setSelected] =
    useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    authService
      .users()
      .then((value) => {
        setUsers(value);
        setSelected(
          value[0]?.id ?? null,
        );
      })
      .finally(() =>
        setLoading(false),
      );
  }, []);

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) =>
          user.id === selected,
      ) ?? null,
    [users, selected],
  );

  async function login() {
    if (!selected) return;

    try {
      const user =
        await authService.login(
          selected,
          pin,
        );

      setUser(user);
      router.replace(
        '/(tabs)/dashboard',
      );
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.invalidPin'),
      );
      setPin('');
    }
  }

  function key(value: string) {
    if (value === 'clear') {
      setPin('');
      return;
    }

    if (value === 'back') {
      setPin((current) =>
        current.slice(0, -1),
      );
      return;
    }

    if (pin.length < 8) {
      setPin(
        (current) =>
          current + value,
      );
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{
        flex: 1,
        backgroundColor:
          th.colors.background,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection:
            compact
              ? 'column'
              : 'row',
          backgroundColor:
            th.colors.background,
        }}
      >
      {!compact ? (
        <View
          style={{
            flex: 1,
            backgroundColor:
              th.colors.primary,
            padding: 44,
            justifyContent:
              'space-between',
          }}
        >
          <View>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor:
                  '#FFFFFF',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                marginBottom: 28,
              }}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={28}
                color={
                  th.colors.primary
                }
              />
            </View>

            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 38,
                fontWeight: '900',
                letterSpacing: -1.1,
              }}
            >
              {t(
                'premium.login.maobitsPos',
              )}
            </Text>

            <Text
              style={{
                color: '#C7D2FE',
                fontSize: 16,
                lineHeight: 24,
                marginTop: 14,
                maxWidth: 430,
              }}
            >
              {t(
                'premium.login.aProfessionalModularLocalFirstPointOf',
              )}
            </Text>
          </View>

          <View
            style={{
              gap: 12,
            }}
          >
            <Badge
              label={t(
                'premium.login.localSqliteOfflineFirst',
              )}
              tone="success"
              icon="shield-checkmark-outline"
            />

            <Text
              style={{
                color: '#C7D2FE',
                fontSize: 12,
              }}
            >
              {t(
                'premium.login.institutoMaobitsSASNit902010335',
              )}
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent:
            'center',
          paddingTop:
            compact ? 18 : 44,
          paddingHorizontal:
            compact ? 18 : 44,
          paddingBottom:
            insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
          }}
        >
          {compact ? (
            <View
              style={{
                alignItems:
                  'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 20,
                  backgroundColor:
                    th.colors
                      .primarySoft,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={31}
                  color={
                    th.colors.primary
                  }
                />
              </View>

              <Text
                style={{
                  color:
                    th.colors.heading,
                  fontSize: 26,
                  fontWeight: '900',
                  marginTop: 14,
                }}
              >
                {t('auth.title')}
              </Text>

              <Text
                style={{
                  color:
                    th.colors.muted,
                  marginTop: 4,
                }}
              >
                {t('auth.subtitle')}
              </Text>
            </View>
          ) : (
            <View
              style={{
                marginBottom: 22,
              }}
            >
              <Text
                style={{
                  color:
                    th.colors.heading,
                  fontSize: 30,
                  fontWeight: '900',
                }}
              >
                {t(
                  'premium.login.welcomeBack',
                )}
              </Text>

              <Text
                style={{
                  color:
                    th.colors.muted,
                  marginTop: 5,
                }}
              >
                {t(
                  'premium.login.selectYourUserAndEnterThePin',
                )}
              </Text>
            </View>
          )}

          <Card>
            <View
              style={{
                gap: 4,
              }}
            >
              <Text
                style={{
                  color:
                    th.colors.muted,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1,
                  textTransform:
                    'uppercase',
                }}
              >
                {t('auth.selectUser')}
              </Text>

              <Text
                style={{
                  color:
                    th.colors.muted,
                  fontSize: 11,
                }}
              >
                {t(
                  'premiumExtra.checkpoint25.horizontalUsersHelp',
                )}
              </Text>
            </View>

            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={
                users.length > 3
              }
              contentContainerStyle={{
                gap: 10,
                paddingVertical: 5,
                paddingHorizontal: 2,
              }}
              style={{
                flexGrow: 0,
              }}
            >
              {users.map((user) => {
                const active =
                  selected === user.id;

                return (
                  <Pressable
                    key={user.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: active,
                    }}
                    accessibilityLabel={
                      user.name
                    }
                    onPress={() => {
                      setSelected(
                        user.id,
                      );
                      setPin('');
                    }}
                    style={({
                      pressed,
                    }) => ({
                      width: 126,
                      minHeight: 134,
                      opacity:
                        pressed
                          ? 0.76
                          : 1,
                    })}
                  >
                    <View
                      style={{
                        flex: 1,
                        position:
                          'relative',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        gap: 7,
                        padding: 12,
                        borderRadius: 18,
                        backgroundColor:
                          active
                            ? th.colors
                                .primarySoft
                            : th.colors
                                .surfaceAlt,
                        borderWidth:
                          active ? 2 : 1,
                        borderColor:
                          active
                            ? th.colors
                                .primary
                            : th.colors
                                .border,
                      }}
                    >
                      <Avatar
                        name={
                          user.name
                        }
                        uri={
                          user.avatar_uri
                        }
                        size={64}
                        tone={
                          active
                            ? 'info'
                            : 'neutral'
                        }
                      />

                      <Text
                        numberOfLines={1}
                        style={{
                          width: '100%',
                          color:
                            th.colors
                              .text,
                          textAlign:
                            'center',
                          fontWeight:
                            '900',
                          fontSize: 13,
                        }}
                      >
                        {user.name}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={{
                          width: '100%',
                          color:
                            th.colors
                              .muted,
                          textAlign:
                            'center',
                          fontSize: 11,
                        }}
                      >
                        {user.role_name}
                      </Text>

                      {active ? (
                        <View
                          style={{
                            position:
                              'absolute',
                            top: 7,
                            right: 7,
                            borderRadius:
                              12,
                            backgroundColor:
                              th.colors
                                .surface,
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={
                              th.colors
                                .primary
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={{
                alignItems: 'center',
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color:
                    th.colors.muted,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {`${t(
                  'premiumExtra.checkpoint25.pinForUser',
                )} ${
                  selectedUser?.name ??
                  t(
                    'premiumExtra.checkpoint25.userFallback',
                  )
                }`}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                {[0, 1, 2, 3].map(
                  (index) => (
                    <View
                      key={index}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor:
                          pin.length >
                          index
                            ? th.colors
                                .primary
                            : th.colors
                                .border,
                      }}
                    />
                  ),
                )}
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent:
                  'center',
              }}
            >
              {[
                1, 2, 3, 4, 5,
                6, 7, 8, 9,
              ].map((number) => (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  accessibilityLabel={`PIN ${number}`}
                  onPress={() =>
                    key(
                      String(number),
                    )
                  }
                  style={({
                    pressed,
                  }) => ({
                    width: '29%',
                    minHeight: 58,
                    borderRadius: 17,
                    backgroundColor:
                      pressed
                        ? th.colors
                            .primarySoft
                        : th.colors
                            .surfaceAlt,
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    borderWidth: 1,
                    borderColor:
                      th.colors.border,
                  })}
                >
                  <Text
                    style={{
                      color:
                        th.colors.text,
                      fontSize: 22,
                      fontWeight:
                        '800',
                    }}
                  >
                    {number}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'premiumExtra.login.clearPin',
                )}
                onPress={() =>
                  key('clear')
                }
                style={({
                  pressed,
                }) => ({
                  width: '29%',
                  minHeight: 58,
                  borderRadius: 17,
                  backgroundColor:
                    th.colors
                      .dangerSoft,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  opacity:
                    pressed
                      ? 0.75
                      : 1,
                })}
              >
                <Ionicons
                  name="trash-outline"
                  size={21}
                  color={
                    th.colors.danger
                  }
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="PIN 0"
                onPress={() =>
                  key('0')
                }
                style={({
                  pressed,
                }) => ({
                  width: '29%',
                  minHeight: 58,
                  borderRadius: 17,
                  backgroundColor:
                    pressed
                      ? th.colors
                          .primarySoft
                      : th.colors
                          .surfaceAlt,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  borderWidth: 1,
                  borderColor:
                    th.colors.border,
                })}
              >
                <Text
                  style={{
                    color:
                      th.colors.text,
                    fontSize: 22,
                    fontWeight: '800',
                  }}
                >
                  0
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'premiumExtra.checkpoint25.backspacePin',
                )}
                onPress={() =>
                  key('back')
                }
                style={({
                  pressed,
                }) => ({
                  width: '29%',
                  minHeight: 58,
                  borderRadius: 17,
                  backgroundColor:
                    th.colors
                      .surfaceAlt,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  opacity:
                    pressed
                      ? 0.75
                      : 1,
                })}
              >
                <Ionicons
                  name="backspace-outline"
                  size={23}
                  color={
                    th.colors.muted
                  }
                />
              </Pressable>
            </View>

            <Button
              fullWidth
              icon="log-in-outline"
              label={t('auth.login')}
              disabled={
                !selected ||
                pin.length < 4
              }
              onPress={login}
            />
          </Card>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
