import React, {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  userService,
  type UserAdminRow,
} from '@/modules/users/service';
import { roleService } from '@/modules/roles/service';
import type { RoleRow } from '@/modules/roles/repository';
import { useSessionStore } from '@/stores/session';
import { t } from '@/core/i18n';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  ModalSheet,
  PageHeader,
  Screen,
  SectionTitle,
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Users() {
  const th = useAppTheme();
  const actor = useSessionStore(
    (s) => s.user,
  );

  const [rows, setRows] =
    useState<UserAdminRow[]>([]);
  const [roles, setRoles] =
    useState<RoleRow[]>([]);
  const [modal, setModal] =
    useState<'edit' | 'pin' | null>(
      null,
    );
  const [editing, setEditing] =
    useState<UserAdminRow | null>(
      null,
    );
  const [name, setName] =
    useState('');
  const [pin, setPin] =
    useState('');
  const [roleId, setRoleId] =
    useState<string | null>(null);
  const [
    pendingAvatar,
    setPendingAvatar,
  ] = useState<string | null>(
    null,
  );
  const [
    avatarRemoved,
    setAvatarRemoved,
  ] = useState(false);

  async function load() {
    if (!actor) return;

    setRows(
      await userService.list(
        actor.id,
      ),
    );

    setRoles(
      await roleService.list(),
    );
  }

  useEffect(() => {
    void load();
  }, [actor?.id]);

  function resetAvatarDraft() {
    setPendingAvatar(null);
    setAvatarRemoved(false);
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setPin('');
    setRoleId(
      roles[0]?.id ?? null,
    );
    resetAvatarDraft();
    setModal('edit');
  }

  function openEdit(
    user: UserAdminRow,
  ) {
    setEditing(user);
    setName(user.name);
    setRoleId(user.role_id);
    setPin('');
    resetAvatarDraft();
    setModal('edit');
  }

  async function pickAvatar() {
    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

    if (result.canceled) {
      return;
    }

    setPendingAvatar(
      result.assets[0]!.uri,
    );
    setAvatarRemoved(false);
  }

  function removeAvatarDraft() {
    setPendingAvatar(null);
    setAvatarRemoved(true);
  }

  async function save() {
    if (
      !actor ||
      !roleId
    ) {
      return;
    }

    try {
      let userId =
        editing?.id ?? null;

      if (editing) {
        await userService.update(
          actor.id,
          editing.id,
          {
            name,
            roleId,
          },
        );
      } else {
        userId =
          await userService.create(
            actor.id,
            {
              name,
              roleId,
              pin,
            },
          );
      }

      if (userId) {
        if (avatarRemoved) {
          await userService.setAvatar(
            actor.id,
            userId,
            null,
          );
        } else if (
          pendingAvatar
        ) {
          await userService.setAvatar(
            actor.id,
            userId,
            pendingAvatar,
          );
        }
      }

      setModal(null);
      resetAvatarDraft();
      await load();
    } catch (error) {
      Alert.alert(
        'MAOBITS POS',
        error instanceof Error
          ? t(error.message)
          : t('errors.unknown'),
      );
    }
  }

  async function resetPin() {
    if (
      !actor ||
      !editing
    ) {
      return;
    }

    try {
      await userService.resetPin(
        actor.id,
        editing.id,
        pin,
      );

      setModal(null);
      setPin('');

      Alert.alert(
        'MAOBITS POS',
        t(
          'premiumExtra.users.pinUpdated',
        ),
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

  const avatarUri =
    avatarRemoved
      ? null
      : pendingAvatar ??
        editing?.avatar_uri ??
        null;

  return (
    <Screen>
      <PageHeader
        title={t('users.title')}
        subtitle={t(
          'premium.users.localUsersRolesStatusAndProtectedPin',
        )}
        eyebrow={t(
          'premium.users.milestone4Access',
        )}
        right={
          <Button
            compact
            icon="person-add-outline"
            label={t('users.new')}
            onPress={openCreate}
          />
        }
      />

      {rows.length ? (
        rows.map((user) => (
          <Card key={user.id}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Avatar
                name={user.name}
                uri={user.avatar_uri}
                size={52}
                tone={
                  user.active
                    ? 'info'
                    : 'danger'
                }
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color:
                      th.colors.heading,
                    fontWeight: '900',
                  }}
                >
                  {user.name}
                </Text>

                <Text
                  style={{
                    color:
                      th.colors.muted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {user.role_name}
                </Text>
              </View>

              <Badge
                label={
                  user.active
                    ? t(
                        'common.active',
                      )
                    : t(
                        'common.inactive',
                      )
                }
                tone={
                  user.active
                    ? 'success'
                    : 'warning'
                }
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Button
                compact
                variant="ghost"
                icon="create-outline"
                label={t(
                  'common.edit',
                )}
                onPress={() =>
                  openEdit(user)
                }
              />

              <Button
                compact
                variant="ghost"
                icon="key-outline"
                label={t(
                  'premium.users.changePin',
                )}
                onPress={() => {
                  setEditing(user);
                  setPin('');
                  setModal('pin');
                }}
              />

              {user.id !==
              actor?.id ? (
                <Button
                  compact
                  variant="ghost"
                  icon={
                    user.active
                      ? 'pause-circle-outline'
                      : 'play-circle-outline'
                  }
                  label={
                    user.active
                      ? t(
                          'common.inactive',
                        )
                      : t(
                          'common.active',
                        )
                  }
                  onPress={() =>
                    void userService
                      .setActive(
                        actor!.id,
                        user.id,
                        !user.active,
                      )
                      .then(load)
                  }
                />
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <Empty
          label={t(
            'premium.users.noUsersYet',
          )}
          icon="people-outline"
        />
      )}

      <ModalSheet
        visible={modal === 'edit'}
        title={
          editing
            ? t('common.edit')
            : t('users.new')
        }
        onClose={() => {
          setModal(null);
          resetAvatarDraft();
        }}
      >
        <Card variant="soft">
          <SectionTitle
            title={t(
              'premiumExtra.checkpoint25.avatar',
            )}
            subtitle={t(
              'premiumExtra.checkpoint25.avatarHelp',
            )}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Avatar
              name={
                name ||
                editing?.name ||
                t(
                  'premiumExtra.checkpoint25.userFallback',
                )
              }
              uri={avatarUri}
              size={82}
              tone="info"
            />

            <View
              style={{
                flex: 1,
                gap: 8,
              }}
            >
              <Button
                compact
                variant="secondary"
                icon="image-outline"
                label={t(
                  'premiumExtra.checkpoint25.selectAvatar',
                )}
                onPress={() =>
                  void pickAvatar()
                }
              />

              {avatarUri ? (
                <Button
                  compact
                  variant="ghost"
                  icon="trash-outline"
                  label={t(
                    'premiumExtra.checkpoint25.removeAvatar',
                  )}
                  onPress={
                    removeAvatarDraft
                  }
                />
              ) : null}
            </View>
          </View>
        </Card>

        <Input
          label={t('common.name')}
          icon="person-outline"
          value={name}
          onChangeText={setName}
        />

        {!editing ? (
          <Input
            label={t('users.pin')}
            icon="keypad-outline"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
          />
        ) : null}

        <Text
          style={{
            color:
              th.colors.muted,
            fontWeight: '800',
            fontSize: 12,
          }}
        >
          {t('users.role')}
        </Text>

        {roles.map((role) => (
          <Button
            key={role.id}
            fullWidth
            label={role.name}
            variant={
              roleId === role.id
                ? 'secondary'
                : 'ghost'
            }
            onPress={() =>
              setRoleId(role.id)
            }
          />
        ))}

        <Button
          fullWidth
          icon="save-outline"
          label={t('common.save')}
          disabled={
            !roleId ||
            !name.trim() ||
            (
              !editing &&
              pin.length < 4
            )
          }
          onPress={save}
        />
      </ModalSheet>

      <ModalSheet
        visible={modal === 'pin'}
        title={t(
          'premium.users.changePin',
        )}
        onClose={() =>
          setModal(null)
        }
      >
        <Badge
          label={
            editing?.name ?? ''
          }
          tone="info"
        />

        <Input
          label={t('users.pin')}
          icon="keypad-outline"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
        />

        <Button
          fullWidth
          icon="key-outline"
          label={t(
            'premium.users.updatePin',
          )}
          disabled={pin.length < 4}
          onPress={resetPin}
        />
      </ModalSheet>
    </Screen>
  );
}
