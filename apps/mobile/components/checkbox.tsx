import { Pressable, Text } from 'react-native';
import { radius, useTheme } from '@/lib/theme';

/** Case à cocher accessible (listes, tâches, étapes). */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={{ width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1.5, borderColor: checked ? t.primary : t.border, backgroundColor: checked ? t.primary : t.bgElevated, alignItems: 'center', justifyContent: 'center' }}
    >
      {checked ? <Text style={{ color: t.primaryFg, fontWeight: '800', fontSize: 15 }}>✓</Text> : null}
    </Pressable>
  );
}
