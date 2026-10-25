import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewProps } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';

export function Screen({ children, style, ...props }: ViewProps) {
  const t = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: t.bg, padding: spacing(5) }, style]} {...props}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 30, lineHeight: 36, color: t.secondary, fontWeight: '600', marginBottom: spacing(2) }}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 15, lineHeight: 22, color: t.fgMuted }}>{children}</Text>;
}

export function Card({ children, style, tone = 'default', ...props }: ViewProps & { tone?: 'default' | 'blush' | 'plum' }) {
  const t = useTheme();
  const bg = tone === 'blush' ? t.bgBlush : tone === 'plum' ? t.secondary : t.bgElevated;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius.lg, padding: spacing(5), borderWidth: tone === 'default' ? 1 : 0, borderColor: t.border }, style]} {...props}>
      {children}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean; disabled?: boolean }) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'secondary' ? t.secondary : 'transparent';
  const fg = variant === 'primary' ? t.primaryFg : variant === 'secondary' ? t.secondaryFg : t.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string | null }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: spacing(4) }}>
      <Text style={{ color: t.fg, fontWeight: '500', marginBottom: spacing(1.5) }}>{label}</Text>
      <TextInput
        placeholderTextColor={t.fgSubtle}
        accessibilityLabel={label}
        style={[styles.input, { backgroundColor: t.bgElevated, borderColor: error ? t.danger : t.border, color: t.fg }]}
        {...input}
      />
      {error ? <Text style={{ color: t.danger, marginTop: spacing(1) }}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: `${t.danger}22`, borderRadius: radius.md, padding: spacing(3), marginBottom: spacing(4) }}>
      <Text style={{ color: t.fg }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(6) },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing(4), fontSize: 16 },
});
