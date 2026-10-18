import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { categoryColors, colors, formatDate, priorityColors, priorityLabels } from '../lib/theme';
import { WorkItem } from '../types';
import { Avatar } from './ui';

/**
 * Card de item, usado no quadro e na lista. A borda segue a categoria do status — mesma ideia do
 * brilho neon do `KanbanCard` web (`BACKLOG` fica com a borda neutra).
 */
export function ItemCard({ item, parentTitle }: { item: WorkItem; parentTitle?: string }) {
  const glow = item.status.category === 'BACKLOG' ? undefined : categoryColors[item.status.category];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/items/[itemId]', params: { itemId: item.id } })}
      style={({ pressed }) => [
        styles.card,
        glow && { borderColor: glow, shadowColor: glow },
        pressed && { backgroundColor: colors.surfaceRaised },
      ]}
    >
      {parentTitle && (
        <Text style={styles.parent} numberOfLines={1}>
          ↳ {parentTitle}
        </Text>
      )}
      <Text style={styles.title}>{item.title}</Text>

      <View style={styles.meta}>
        {item.priority !== 'NONE' && (
          <View style={styles.priority}>
            <View style={[styles.dot, { backgroundColor: priorityColors[item.priority] }]} />
            <Text style={styles.metaText}>{priorityLabels[item.priority]}</Text>
          </View>
        )}
        {item.dueDate && <Text style={styles.metaText}>📅 {formatDate(item.dueDate)}</Text>}
        {item.recurrenceUnit && <Text style={styles.metaText}>↻</Text>}
        {item.statusLockedById && <Text style={styles.metaText}>🔒</Text>}
        {item.module && <Text style={styles.metaText}>▦ {item.module.name}</Text>}
      </View>

      {(item.labels.length > 0 || item.assignees.length > 0) && (
        <View style={styles.footer}>
          <View style={styles.labels}>
            {item.labels.map(({ label }) => (
              <View key={label.id} style={styles.label}>
                <View style={[styles.dot, { backgroundColor: label.color }]} />
                <Text style={styles.labelText} numberOfLines={1}>
                  {label.name}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.assignees}>
            {item.assignees.slice(0, 3).map(({ user }, i) => (
              <View key={user.id} style={i > 0 && { marginLeft: -6 }}>
                <Avatar name={user.fullName} size={22} />
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    gap: 8,
    // Brilho sutil na cor da categoria (Android usa `elevation`, que respeita `shadowColor` na API 28+).
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  parent: { fontSize: 11, color: colors.textFaint },
  title: { fontSize: 14, color: colors.text, fontWeight: '500' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  priority: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 12, color: colors.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 140,
  },
  labelText: { fontSize: 11, color: colors.textSecondary },
  assignees: { flexDirection: 'row' },
});
