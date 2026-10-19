import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { Category } from '@/lib/types';

type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'amount';

const TEXT_STYLES: Record<TextVariant, { fontSize: number; fontWeight: '400' | '500' | '600' | '700' }> = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
  amount: { fontSize: 24, fontWeight: '700' },
};

export function AppText({
  variant = 'body',
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: TextVariant; muted?: boolean; color?: string }) {
  const p = usePalette();
  return (
    <Text
      style={[TEXT_STYLES[variant], { color: color ?? (muted ? p.textSecondary : p.text) }, variant === 'amount' && { fontVariant: ['tabular-nums'] }, style]}
      {...props}
    />
  );
}

export function Card({ style, ...props }: ViewProps) {
  const p = usePalette();
  return (
    <View
      style={[{ backgroundColor: p.surface, borderColor: p.border, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg }, style]}
      {...props}
    />
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const p = usePalette();
  const bg = variant === 'primary' ? p.primary : 'transparent';
  const fg = variant === 'primary' ? p.onPrimary : variant === 'danger' ? p.danger : p.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: Radius.md,
        paddingVertical: 14,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: Spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        placeholderTextColor={p.textSecondary}
        style={{
          backgroundColor: p.surface,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: 12,
          fontSize: 16,
          color: p.text,
        }}
        {...props}
      />
      {hint ? <AppText variant="caption" muted>{hint}</AppText> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress: () => void; color?: string }) {
  const p = usePalette();
  const accent = color ?? p.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: selected ? accent : p.border,
        backgroundColor: selected ? accent + '22' : p.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
      }}>
      <Text style={{ color: selected ? p.text : p.textSecondary, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}

export function CategoryIcon({ category, size = 36 }: { category?: Category; size?: number }) {
  const color = category?.color ?? '#94A3B8';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '26',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={(category?.icon ?? 'pricetag') as ComponentProps<typeof Ionicons>['name']} size={size * 0.5} color={color} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: p.surfaceAlt, borderRadius: Radius.md, padding: 3 }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: Radius.sm,
              backgroundColor: selected ? p.surface : 'transparent',
            }}>
            <Text style={{ color: selected ? p.text : p.textSecondary, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon, title, children }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; children?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl }}>
      <Ionicons name={icon} size={36} color={p.textSecondary} />
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}
