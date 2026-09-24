import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { roleService } from '@/modules/roles/service';
import type { RoleRow } from '@/modules/roles/repository';
import { PERMISSIONS, type PermissionCode } from '@/core/permissions/catalog';
import { useSessionStore } from '@/stores/session';
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
} from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

type PermissionGroup = {
  titleKey: string;
  prefixes: string[];
};

const GROUPS: PermissionGroup[] = [
  { titleKey: 'premiumExtra.roles.dashboardPos', prefixes: ['DASHBOARD', 'POS', 'SCANNER', 'CATALOG'] },
  { titleKey: 'premiumExtra.roles.productsInventory', prefixes: ['PRODUCT', 'INVENTORY', 'PURCHASES'] },
  { titleKey: 'premiumExtra.roles.suppliers', prefixes: ['SUPPLIERS'] },
  { titleKey: 'premiumExtra.roles.customersCredit', prefixes: ['CUSTOMER'] },
  { titleKey: 'premiumExtra.roles.cashSales', prefixes: ['CASH', 'SALES'] },
  { titleKey: 'premiumExtra.roles.administration', prefixes: ['REPORTS', 'USERS', 'SETTINGS', 'BACKUP'] },
];

function permissionLabel(permission: PermissionCode): string {
  return t(`premiumExtra.roles.permissionLabels.${permission}`);
}

function permissionDescription(permission: PermissionCode): string {
  return t(`premiumExtra.roles.permissionDescriptions.${permission}`);
}

export default function Roles() {
  const th = useAppTheme();
  const actor = useSessionStore((s) => s.user);
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<PermissionCode[]>([]);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  async function load() {
    setRows(await roleService.list());
  }

  useEffect(() => {
    void load();
  }, []);

  async function open(role?: RoleRow) {
    setEditing(role ?? null);
    setName(role?.name ?? '');
    setSelected(
      role
        ? ((await roleService.permissions(role.id)) as PermissionCode[])
        : [],
    );
    setModal(true);
  }

  async function save() {
    if (!actor) return;

    if (editing) {
      await roleService.update(actor.id, editing.id, {
        name,
        permissions: selected,
      });
    } else {
      await roleService.create(actor.id, {
        name,
        permissions: selected,
      });
    }

    setModal(false);
    setEditing(null);
    setName('');
    setSelected([]);
    await load();
  }

  function toggle(permission: PermissionCode) {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((code) => code !== permission)
        : [...current, permission],
    );
  }

  function toggleGroup(items: PermissionCode[]) {
    const allSelected = items.every((permission) =>
      selected.includes(permission),
    );

    if (allSelected) {
      setSelected((current) =>
        current.filter((permission) => !items.includes(permission)),
      );
      return;
    }

    setSelected((current) => [
      ...current,
      ...items.filter((permission) => !current.includes(permission)),
    ]);
  }

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: PERMISSIONS.filter((permission) =>
          group.prefixes.some((prefix) => permission.startsWith(prefix)),
        ),
      })),
    [],
  );

  return (
    <Screen>
      <PageHeader
        title={t('roles.title')}
        subtitle={t('premium.roles.granularPermissionsEnforcedInUiAndService')}
        eyebrow={t('premium.roles.milestone4Authorization')}
        right={
          <Button
            compact
            icon="add"
            label={t('roles.new')}
            onPress={() => void open()}
          />
        }
      />

      {rows.map((role) => (
        <Card
          key={role.id}
          onPress={() => {
            if (!role.is_system) void open(role);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                backgroundColor: role.is_system
                  ? th.colors.successSoft
                  : th.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{role.is_system ? '🛡️' : '🔐'}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  fontSize: 16,
                }}
              >
                {role.name}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {role.is_system
                  ? t('premiumExtra.roles.protectedSystemRole')
                  : t('premiumExtra.roles.editableCustomRole')}
              </Text>
            </View>

            <Badge
              label={
                role.is_system
                  ? t('premiumExtra.roles.systemRole')
                  : t('premiumExtra.roles.customRole')
              }
              tone={role.is_system ? 'success' : 'info'}
            />
          </View>
        </Card>
      ))}

      <ModalSheet
        visible={modal}
        title={editing ? t('common.edit') : t('roles.new')}
        onClose={() => setModal(false)}
      >
        <Input
          label={t('common.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('premiumExtra.roles.roleNameExample')}
          autoCapitalize="words"
        />

        <Card variant="soft">
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                backgroundColor: th.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={th.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: th.colors.heading,
                  fontWeight: '900',
                  fontSize: 15,
                }}
              >
                {t('premiumExtra.roles.choosePermissions')}
              </Text>
              <Text
                style={{
                  color: th.colors.muted,
                  fontSize: 12,
                  marginTop: 3,
                  lineHeight: 17,
                }}
              >
                {t('premiumExtra.roles.choosePermissionsHelp')}
              </Text>
            </View>
          </View>
        </Card>

        {grouped.map((group) => {
          const allSelected =
            group.items.length > 0 &&
            group.items.every((permission) => selected.includes(permission));

          const selectedCount = group.items.filter((permission) =>
            selected.includes(permission),
          ).length;

          return (
            <Card key={group.titleKey} variant="soft">
              <SectionTitle
                title={t(group.titleKey)}
                subtitle={t('premiumExtra.roles.permissionsCount', {
                  selected: selectedCount,
                  total: group.items.length,
                })}
                right={
                  <Button
                    compact
                    variant="ghost"
                    label={
                      allSelected
                        ? t('premiumExtra.roles.clearGroup')
                        : t('premiumExtra.roles.selectAll')
                    }
                    onPress={() => toggleGroup(group.items)}
                  />
                }
              />

              {group.items.map((permission) => {
                const active = selected.includes(permission);
                const label = permissionLabel(permission);
                const description = permissionDescription(permission);

                return (
                  <Card
                    key={permission}
                    onPress={() => toggle(permission)}
                    accessibilityLabel={`${label}. ${description}`}
                    style={{
                      backgroundColor: active
                        ? th.colors.primarySoft
                        : th.colors.surface,
                      borderColor: active
                        ? th.colors.primary
                        : th.colors.border,
                      borderWidth: active ? 2 : 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 11,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: active
                            ? th.colors.primary
                            : th.colors.surfaceAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={active ? 'checkmark' : 'ellipse-outline'}
                          size={19}
                          color={active ? '#FFFFFF' : th.colors.subtle}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: th.colors.heading,
                            fontWeight: '900',
                            fontSize: 14,
                          }}
                        >
                          {label}
                        </Text>

                        <Text
                          style={{
                            color: th.colors.muted,
                            fontSize: 12,
                            lineHeight: 17,
                            marginTop: 3,
                          }}
                        >
                          {description}
                        </Text>

                        <Text
                          style={{
                            color: th.colors.subtle,
                            fontSize: 10,
                            marginTop: 6,
                            fontFamily: 'monospace',
                          }}
                        >
                          {t('premiumExtra.roles.technicalCode')}: {permission}
                        </Text>
                      </View>

                      <Badge
                        label={
                          active
                            ? t('premiumExtra.roles.allowed')
                            : t('premiumExtra.roles.notAllowed')
                        }
                        tone={active ? 'success' : 'neutral'}
                      />
                    </View>
                  </Card>
                );
              })}
            </Card>
          );
        })}

        <Button
          fullWidth
          icon="save-outline"
          label={t('common.save')}
          disabled={!name.trim()}
          onPress={save}
        />
      </ModalSheet>
    </Screen>
  );
}
