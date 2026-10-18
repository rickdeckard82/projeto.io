import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { errorMessage } from '../../api/client';
import { getProject, listItems, listStatuses } from '../../api/projects';
import { categoryColors, colors, formatDate, priorityColors, priorityLabels } from '../../lib/theme';
import { Status, WorkItem } from '../../types';

/**
 * Itens do projeto agrupados pelas colunas do kanban (na ordem de `position`) — a "visão de lista"
 * do web. Só leitura nesta primeira versão; o kanban e a edição vêm nas próximas fases.
 */
export default function ProjectItemsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const statuses = useQuery({ queryKey: ['statuses', projectId], queryFn: () => listStatuses(projectId) });
  const items = useQuery({ queryKey: ['items', projectId], queryFn: () => listItems(projectId) });

  const sections = useMemo(() => {
    if (!statuses.data || !items.data) return [];
    return [...statuses.data]
      .sort((a, b) => a.position - b.position)
      .map((status) => ({ status, data: items.data.filter((i) => i.statusId === status.id) }));
  }, [statuses.data, items.data]);

  const error = project.error ?? statuses.error ?? items.error;

  return (
    <>
      <Stack.Screen options={{ title: project.data?.name ?? '' }} />
      {statuses.isPending || items.isPending ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : error ? (
        <Text style={styles.empty}>{errorMessage(error)}</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={items.isRefetching}
              onRefresh={() => void Promise.all([items.refetch(), statuses.refetch()])}
              colors={[colors.primary]}
            />
          }
          renderSectionHeader={({ section }) => <SectionHeader status={section.status} count={section.data.length} />}
          renderItem={({ item }) => <ItemRow item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum item neste projeto.</Text>}
        />
      )}
    </>
  );
}

function SectionHeader({ status, count }: { status: Status; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.dot, { backgroundColor: categoryColors[status.category] }]} />
      <Text style={styles.sectionTitle}>{status.name}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function ItemRow({ item }: { item: WorkItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.meta}>
        {item.priority !== 'NONE' && (
          <Text style={[styles.badge, { color: priorityColors[item.priority], borderColor: priorityColors[item.priority] }]}>
            {priorityLabels[item.priority]}
          </Text>
        )}
        {item.dueDate && <Text style={styles.metaText}>Prazo {formatDate(item.dueDate)}</Text>}
        {item.recurrenceUnit && <Text style={styles.metaText}>↻ Recorrente</Text>}
        {item.module && <Text style={styles.metaText}>{item.module.name}</Text>}
        {item.parentId && <Text style={styles.metaText}>↳ sub-item</Text>}
      </View>
      {item.labels.length > 0 && (
        <View style={styles.meta}>
          {item.labels.map(({ label }) => (
            <Text key={label.id} style={[styles.label, { backgroundColor: label.color }]}>
              {label.name}
            </Text>
          ))}
        </View>
      )}
      {item.assignees.length > 0 && (
        <Text style={styles.metaText} numberOfLines={1}>
          {item.assignees.map((a) => a.user.fullName).join(', ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  sectionCount: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },
  title: { fontSize: 15, color: colors.text, fontWeight: '500' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaText: { fontSize: 12, color: colors.textMuted },
  badge: { fontSize: 11, borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  label: { fontSize: 11, color: '#fff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
});
