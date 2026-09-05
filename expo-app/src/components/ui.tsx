import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radius, spacing } from '../theme';
import type { TxnStatus } from '../types';

export { Header } from './Header';

// ---------- Screen ----------

export function Screen({
  children,
  scroll,
  contentStyle,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const body = <View style={[styles.screenInner, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function SectionBlock({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.sectionBlock, style]}>{children}</View>;
}

// ---------- Logo ----------

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.logoWrap, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <LinearGradient
        colors={[...palette.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logoGrad, { borderRadius: size * 0.3 }]}
      >
        <Ionicons name="flash" size={size * 0.58} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
}

// ---------- Button ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  onPress,
  label,
  variant = 'primary',
  disabled,
  loading,
  block,
  size = 'md',
  icon,
  style,
  textStyle,
}: {
  onPress?: () => void;
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const height = size === 'sm' ? 38 : size === 'lg' ? 56 : 48;
  const isDisabled = disabled || loading;
  const content = (
    <View style={[styles.btnInner, { opacity: isDisabled ? 0.6 : 1 }]}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? palette.primary : '#FFFFFF'} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={variant === 'outline' || variant === 'ghost' ? palette.primary : '#fff'} style={{ marginRight: 8 }} /> : null}
          <Text
            style={[
              styles.btnText,
              variant === 'outline' || variant === 'ghost' ? styles.btnTextOutline : styles.btnTextSolid,
              size === 'sm' ? styles.btnTextSm : size === 'lg' ? styles.btnTextLg : null,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const base: ViewStyle = { height, borderRadius: radius.md, overflow: 'hidden' };
  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, block && styles.btnBlock, style, pressed && styles.pressed]}>
        <LinearGradient colors={[...palette.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {content}
      </Pressable>
    );
  }
  if (variant === 'secondary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, block && styles.btnBlock, styles.btnSecondary, style, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  if (variant === 'outline') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, block && styles.btnBlock, styles.btnOutline, style, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, block && styles.btnBlock, style, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

// ---------- Card ----------

export function Card({
  children,
  style,
  onPress,
  gradient,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  gradient?: boolean;
}) {
  const inner = <View style={[styles.card, gradient && styles.cardGradientInner, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

// ---------- Field ----------

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  error,
  multiline,
  right,
  autoCapitalize,
  autoComplete,
  maxLength,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad' | 'numeric' | 'decimal-pad';
  secureTextEntry?: boolean;
  error?: string | null;
  multiline?: boolean;
  right?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'tel' | 'new-password' | 'off';
  maxLength?: number;
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null, { opacity: editable ? 1 : 0.6 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoComplete={autoComplete ?? 'off'}
          autoCorrect={false}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ---------- Chip ----------

export function Chip({
  label,
  selected,
  onPress,
  color,
  textColor,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? { borderColor: color ?? palette.primary, backgroundColor: color ? `${color}22` : '#E7F6EE' } : styles.chipOff,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.chipDot, { backgroundColor: color ?? palette.primary }]} />
      <Text
        style={[
          styles.chipText,
          selected ? { color: textColor ?? palette.primary, fontWeight: '700' } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- Badges ----------

const statusColor: Record<TxnStatus, string> = {
  PENDING: palette.warning,
  PROCESSING: palette.info,
  SUCCESSFUL: palette.success,
  FAILED: palette.danger,
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColor[status as TxnStatus] ?? palette.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export function Tag({ label, color = palette.info }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderRadius: radius.sm }]}>
      <Text style={[styles.badgeText, { color, fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

// ---------- Section header ----------

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- Loading / empty ----------

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={palette.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
      {onRetry ? (
        <Button label="Retry" variant="outline" onPress={onRetry} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={[styles.center, { paddingVertical: spacing.xxl }]}>
      <Ionicons name={icon} size={42} color={palette.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------- List row ----------

export function ListItem({
  icon,
  iconColor = palette.primary,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listItem, last && styles.listItemLast, pressed && styles.pressed]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.listBody}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

// ---------- Info row ----------

export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  screenInner: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  scrollContent: { paddingBottom: spacing.xxl },
  sectionBlock: { marginBottom: spacing.lg },
  logoWrap: { overflow: 'hidden' },
  logoGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.82 },
  btnInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  btnTextSolid: { color: '#FFFFFF' },
  btnTextOutline: { color: palette.primary },
  btnTextSm: { fontSize: 13 },
  btnTextLg: { fontSize: 17 },
  btnBlock: { alignSelf: 'stretch' },
  btnSecondary: { backgroundColor: '#E7F6EE' },
  btnOutline: { backgroundColor: palette.card, borderWidth: 1.5, borderColor: '#CFEADB' },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  cardGradientInner: { backgroundColor: 'transparent' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: palette.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.inputBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputWrapError: { borderColor: palette.danger },
  input: { flex: 1, height: 52, fontSize: 15, color: palette.text },
  inputMultiline: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  fieldError: { color: palette.danger, fontSize: 12, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipOff: { borderColor: palette.border, backgroundColor: palette.card },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  chipText: { fontSize: 13, fontWeight: '600', color: palette.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: palette.text },
  sectionAction: { fontSize: 13, fontWeight: '700', color: palette.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.md, color: palette.textMuted },
  emptyText: { textAlign: 'center', color: palette.textMuted, fontSize: 14, marginTop: spacing.md },
  emptyTitle: { fontWeight: '700', color: palette.text, fontSize: 15, marginTop: spacing.md, textAlign: 'center' },
  emptySubtitle: { color: palette.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  listItemLast: { borderBottomWidth: 0 },
  listIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listBody: { flex: 1, marginRight: spacing.sm },
  listTitle: { fontSize: 15, fontWeight: '600', color: palette.text },
  listSubtitle: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { color: palette.textMuted, fontSize: 13 },
  infoValue: { color: palette.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  mono: { fontFamily: 'monospace' },
});