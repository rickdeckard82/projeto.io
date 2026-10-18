import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

/**
 * Seleção única em "chips" com rolagem horizontal — substitui os `<select>` do web (status,
 * prioridade), que no celular ficariam escondidos atrás de um toque a mais.
 */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled || active}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive, disabled && !active && styles.chipDisabled]}
          >
            {opt.color && <View style={[styles.dot, { backgroundColor: opt.color }]} />}
            <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: 'rgba(79,70,229,0.25)' }, // indigo-600/25
  chipDisabled: { opacity: 0.4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, color: colors.textSecondary },
  textActive: { color: colors.text, fontWeight: '600' },
});
