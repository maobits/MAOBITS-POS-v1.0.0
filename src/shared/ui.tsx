import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { formatMoney, parseMoneyInput } from '@/core/money';
import { usePreferencesStore } from '@/stores/preferences';
import { t } from '@/core/i18n';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export function Screen({
  children,
  scroll = true,
  padded = true,
  scrollRef,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
}) {
  const th = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.content,
    { paddingBottom: 96 + Math.max(insets.bottom, 8) },
    !padded && { paddingHorizontal: 0, paddingTop: 0 },
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safe, { backgroundColor: th.colors.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PageHeader({ title, subtitle, eyebrow, right }: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) {
  const th = useAppTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: th.colors.primary }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: th.colors.heading }]}>{title}</Text>
        {subtitle ? <Text style={[styles.pageSubtitle, { color: th.colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ alignItems: 'flex-end' }}>{right}</View> : null}
    </View>
  );
}

export function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return <PageHeader title={String(children)} subtitle={subtitle} />;
}

export function Card({ children, onPress, variant = 'default', style, accessibilityLabel }: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'soft' | 'primary' | 'dark' | 'warning';
  style?: any;
  accessibilityLabel?: string;
}) {
  const th = useAppTheme();
  const palette = variant === 'primary'
    ? { bg: th.colors.primary, border: th.colors.primary }
    : variant === 'dark'
      ? { bg: th.dark ? '#07111F' : '#1E293B', border: th.dark ? '#17283E' : '#1E293B' }
      : variant === 'warning'
        ? { bg: th.colors.warningSoft, border: `${th.colors.warning}55` }
        : variant === 'soft'
          ? { bg: th.colors.surfaceAlt, border: th.colors.border }
          : { bg: th.colors.surface, border: th.colors.border };
  const content = (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>{children}</View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      {content}
    </Pressable>
  ) : content;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, icon, compact = false, fullWidth = false }: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dark';
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const th = useAppTheme();
  const palette = variant === 'primary'
    ? { bg: th.colors.primary, border: th.colors.primary, text: '#FFFFFF' }
    : variant === 'secondary'
      ? { bg: th.colors.primarySoft, border: th.colors.primarySoft, text: th.colors.primaryText }
      : variant === 'danger'
        ? { bg: th.colors.dangerSoft, border: `${th.colors.danger}33`, text: th.colors.danger }
        : variant === 'success'
          ? { bg: th.colors.successSoft, border: `${th.colors.success}33`, text: th.colors.success }
          : variant === 'dark'
            ? { bg: th.dark ? '#F8FAFC' : '#1E293B', border: th.dark ? '#F8FAFC' : '#1E293B', text: th.dark ? '#0F172A' : '#FFFFFF' }
            : { bg: 'transparent', border: th.colors.border, text: th.colors.text };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        fullWidth && { alignSelf: 'stretch' },
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={palette.text} /> : null}
      <Text style={{ color: palette.text, fontWeight: '800', fontSize: compact ? 13 : 14 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'neutral' }: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: Tone;
}) {
  const th = useAppTheme();
  const color = tone === 'danger' ? th.colors.danger : tone === 'success' ? th.colors.success : tone === 'warning' ? th.colors.warning : tone === 'info' ? th.colors.primary : th.colors.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { borderColor: th.colors.border, backgroundColor: th.colors.surfaceAlt, opacity: pressed ? 0.75 : 1 }]}>
      <Ionicons name={icon} size={19} color={color} />
    </Pressable>
  );
}


function dateToYmd(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ymdToDate(value?: string) {
  if (!value) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0,
  );
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const th = useAppTheme();
  const [open, setOpen] = React.useState(false);
  const selected = ymdToDate(value);

  return (
    <View style={{ gap: 7 }}>
      <Text
        style={{
          color: th.colors.muted,
          fontSize: 12,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 50,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: open
            ? th.colors.primary
            : th.colors.border,
          backgroundColor: th.colors.surface,
          paddingHorizontal: 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={th.colors.primary}
        />
        <Text
          style={{
            color: value
              ? th.colors.text
              : th.colors.subtle,
            flex: 1,
            fontWeight: value ? '800' : '600',
          }}
        >
          {value
            ? selected.toLocaleDateString()
            : t('premiumExtra.checkpoint15.selectDate')}
        </Text>

        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              'premiumExtra.checkpoint15.clearDate',
            )}
            onPress={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={th.colors.subtle}
            />
          </Pressable>
        ) : null}
      </Pressable>

      {open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, date) => {
            if (date) onChange(dateToYmd(date));
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps & { label?: string; icon?: IconName; hint?: string }) {
  const th = useAppTheme();
  const { label, icon, hint, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={[styles.fieldLabel, { color: th.colors.muted }]}>{label}</Text> : null}
      <View style={[styles.inputShell, { borderColor: th.colors.border, backgroundColor: th.colors.surface }]}>
        {icon ? <Ionicons name={icon} size={18} color={th.colors.subtle} /> : null}
        <TextInput
          {...rest}
          placeholderTextColor={th.colors.subtle}
          style={[styles.input, { color: th.colors.text }, style]}
        />
      </View>
      {hint ? <Text style={{ color: th.colors.subtle, fontSize: 11 }}>{hint}</Text> : null}
    </View>
  );
}

export function SearchBar(props: Omit<TextInputProps, 'style'>) {
  return <Input {...props} icon="search-outline" />;
}

export function MoneyField({ label, value, onChangeMinor }: { label?: string; value: number; onChangeMinor: (v: number) => void }) {
  const currency = usePreferencesStore((s) => s.currency);
  const locale = usePreferencesStore((s) => s.locale);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => setText(focused ? String(value) : formatMoney(value, currency, locale)), [value, currency, locale, focused]);
  return (
    <Input
      label={label}
      icon="cash-outline"
      value={text}
      keyboardType="number-pad"
      onFocus={() => { setFocused(true); setText(String(value)); }}
      onChangeText={(v) => { setText(v); onChangeMinor(parseMoneyInput(v)); }}
      onBlur={() => { setFocused(false); setText(formatMoney(value, currency, locale)); }}
    />
  );
}

export function Badge({ label, tone = 'info', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const th = useAppTheme();
  const color = tone === 'success' ? th.colors.success : tone === 'warning' ? th.colors.warning : tone === 'danger' ? th.colors.danger : tone === 'neutral' ? th.colors.muted : th.colors.primary;
  const bg = tone === 'success' ? th.colors.successSoft : tone === 'warning' ? th.colors.warningSoft : tone === 'danger' ? th.colors.dangerSoft : tone === 'neutral' ? th.colors.surfaceAlt : th.colors.primarySoft;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: `${color}2A` }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const th = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 17 }}>{title}</Text>
        {subtitle ? <Text style={{ color: th.colors.muted, marginTop: 2, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function MetricCard({ label, value, icon, tone = 'info', helper }: {
  label: string;
  value: string;
  icon: IconName;
  tone?: Tone;
  helper?: string;
}) {
  const th = useAppTheme();
  const color = tone === 'success' ? th.colors.success : tone === 'warning' ? th.colors.warning : tone === 'danger' ? th.colors.danger : th.colors.primary;
  const bg = tone === 'success' ? th.colors.successSoft : tone === 'warning' ? th.colors.warningSoft : tone === 'danger' ? th.colors.dangerSoft : th.colors.primarySoft;
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View>
        {helper ? <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{helper}</Text> : null}
      </View>
      <Text style={{ color: th.colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: th.colors.heading, fontSize: 24, fontWeight: '900', marginTop: 4 }}>{value}</Text>
    </Card>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} icon="stats-chart-outline" />;
}

export function Empty({ label = t('common.empty'), icon = 'file-tray-outline' as IconName }: { label?: string; icon?: IconName }) {
  const th = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: th.colors.surfaceAlt }]}><Ionicons name={icon} size={28} color={th.colors.subtle} /></View>
      <Text style={{ color: th.colors.muted, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Loader({ label = t('common.loading') }: { label?: string }) {
  const th = useAppTheme();
  return <View style={styles.empty}><ActivityIndicator color={th.colors.primary}/><Text style={{ color: th.colors.muted }}>{label}</Text></View>;
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const th = useAppTheme();
  return (
    <View style={styles.pager}>
      <Button compact variant="ghost" icon="chevron-back" label={t('common.previous')} disabled={page <= 1} onPress={() => onChange(page - 1)} />
      <Text style={{ color: th.colors.muted, fontWeight: '700', fontSize: 12 }}>{t('common.page', { page, pages })}</Text>
      <Button compact variant="ghost" icon="chevron-forward" label={t('common.next')} disabled={page >= pages} onPress={() => onChange(page + 1)} />
    </View>
  );
}

export function ModalSheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const th = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const tablet = width >= 760;
  const maxHeight = Math.max(320, height - Math.max(insets.top, 12) - 16);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.overlay, { backgroundColor: th.colors.overlay }]}> 
          <SafeAreaView
            edges={['left', 'right', 'bottom']}
            style={[
              styles.sheet,
              {
                backgroundColor: th.colors.background,
                maxHeight,
                width: tablet ? Math.min(680, width - 48) : '100%',
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text
                accessibilityRole="header"
                style={{ color: th.colors.heading, fontSize: 20, fontWeight: '900', flex: 1 }}
              >
                {title}
              </Text>
              <IconButton icon="close" label={t('common.close')} onPress={onClose} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 30 + Math.max(insets.bottom, 8) }}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const DEFAULT_ICON_OPTIONS: IconName[] = [
  'cube-outline','cafe-outline','restaurant-outline','fast-food-outline',
  'beer-outline','wine-outline','water-outline','basket-outline','cart-outline',
  'shirt-outline','watch-outline','phone-portrait-outline','laptop-outline',
  'game-controller-outline','home-outline','bed-outline','construct-outline',
  'hardware-chip-outline','car-outline','bicycle-outline','fitness-outline',
  'medkit-outline','book-outline','gift-outline','paw-outline','leaf-outline',
  'sparkles-outline','ellipsis-horizontal-circle-outline',
];

export function IconPicker({ value, onChange, label, icons = DEFAULT_ICON_OPTIONS }: {
  value: IconName;
  onChange: (icon: IconName) => void;
  label?: string;
  icons?: IconName[];
}) {
  const th = useAppTheme();
  return (
    <View style={{ gap: 10 }}>
      {label ? <Text style={[styles.fieldLabel, { color: th.colors.muted }]}>{label}</Text> : null}
      <Card variant="soft" style={{ paddingVertical: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: th.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={value} size={30} color={th.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.colors.heading, fontWeight: '900', fontSize: 15 }}>{label ?? t('categories.icon')}</Text>
            <Text style={{ color: th.colors.muted, fontSize: 12, marginTop: 3 }}>{value}</Text>
          </View>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {icons.map((name) => {
          const selected = name === value;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              onPress={() => onChange(name)}
              style={({ pressed }) => ({
                width: 50,
                height: 50,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? th.colors.primary : th.colors.border,
                backgroundColor: selected ? th.colors.primarySoft : th.colors.surface,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Ionicons name={name} size={22} color={selected ? th.colors.primary : th.colors.muted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Segmented({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  const th = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(o.value)} style={({ pressed }) => [styles.segment, { backgroundColor: active ? th.colors.primary : th.colors.surface, borderColor: active ? th.colors.primary : th.colors.border, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: active ? '#FFFFFF' : th.colors.muted, fontWeight: '800', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const th = useAppTheme();
  const pct = Math.max(0, Math.min(100, value));
  return <View style={[styles.progressTrack, { backgroundColor: th.colors.surfaceAlt }]}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color ?? th.colors.primary }]} /></View>;
}

export function ListRow({ title, subtitle, trailing, icon, tone = 'neutral', onPress }: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  icon?: IconName;
  tone?: Tone;
  onPress?: () => void;
}) {
  const th = useAppTheme();
  const color = tone === 'success' ? th.colors.success : tone === 'warning' ? th.colors.warning : tone === 'danger' ? th.colors.danger : tone === 'info' ? th.colors.primary : th.colors.muted;
  const body = (
    <View style={[styles.listRow, { borderBottomColor: th.colors.border }]}>
      {icon ? <View style={[styles.rowIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={19} color={color} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.colors.text, fontWeight: '800', fontSize: 14 }}>{title}</Text>
        {subtitle ? <Text style={{ color: th.colors.muted, marginTop: 2, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>{body}</Pressable> : body;
}

export function Avatar({
  name,
  tone = 'info',
  uri = null,
  size = 42,
}: {
  name: string;
  tone?: Tone;
  uri?: string | null;
  size?: number;
}) {
  const th = useAppTheme();

  const color =
    tone === 'success'
      ? th.colors.success
      : tone === 'danger'
        ? th.colors.danger
        : tone === 'warning'
          ? th.colors.warning
          : th.colors.primary;

  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
          (part) =>
            part[0]?.toUpperCase(),
        )
        .join('') || 'M',
    [name],
  );

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor:
            th.colors.surfaceAlt,
          borderWidth: 1,
          borderColor:
            th.colors.border,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          `${color}18`,
      }}
    >
      <Text
        style={{
          color,
          fontWeight: '900',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Grid({ children, min = 160 }: { children: React.ReactNode; min?: number }) {
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 4 : width >= 760 ? 3 : width >= 500 ? 2 : 1;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{React.Children.map(children, (child) => <View style={{ width: columns === 1 ? '100%' : `${(100 / columns) - 2}%`, minWidth: min }}>{child}</View>)}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 110, gap: 14 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 2 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  pageSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12, ...Platform.select({ ios: { shadowColor: '#0F172A', shadowOpacity: 0.055, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, android: { elevation: 2 } }) },
  button: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start' },
  buttonCompact: { minHeight: 38, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '800' },
  inputShell: { minHeight: 52, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8 },
  input: { flex: 1, minHeight: 50, fontSize: 15, paddingVertical: 0 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  metricIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 34, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  overlay: { flex: 1, justifyContent: 'flex-end', paddingTop: 36 },
  sheet: { alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 8, gap: 12 },
  sheetHandle: { width: 42, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  segment: { minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
  listRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 11 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
