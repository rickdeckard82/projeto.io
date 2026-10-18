import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../auth/AuthContext';
import { errorMessage } from '../../../api/client';
import { getProject, listItems, listStatuses } from '../../../api/projects';
import { queryKeys } from '../../../api/queryKeys';
import { ItemCard } from '../../../components/ItemCard';
import { useProjectRealtime } from '../../../hooks/useProjectRealtime';
import { canEditItem } from '../../../lib/permissions';
import { categoryColors, colors } from '../../../lib/theme';
import { Status, WorkItem } from '../../../types';

type View_ = 'board' | 'list';

/**
 * Tela do projeto: quadro kanban (colunas com rolagem horizontal, uma por vez com encaixe) ou
 * lista agrupada por status, como as abas "Quadro"/"Itens" do web. Mudar status é feito no
 * detalhe do item — arrastar entre colunas no celular é impreciso. Atualiza em tempo real.
 */
export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('board');

  const project = useQuery({ queryKey: queryKeys.project(projectId), queryFn: () => getProject(projectId) });
  const statuses = useQuery({ queryKey: queryKeys.statuses(projectId), queryFn: () => listStatuses(projectId) });
  const items = useQuery({ queryKey: queryKeys.items(projectId), queryFn: () => listItems(projectId) });
  useProjectRealtime(projectId);

  const columns = useMemo(() => {
    if (!statuses.data || !items.data) return [];
    return [...statuses.data]
      .sort((a, b) => a.position - b.position)
      .map((status) => ({ status, data: items.data.filter((i) => i.statusId === status.id) }));
  }, [statuses.data, items.data]);

  // Sub-itens mostram "↳ título do pai", como no board web.
  const titleById = useMemo(() => new Map(items.data?.map((i) => [i.id, i.title])), [items.data]);

  const archived = !!project.data?.archivedAt;
  const canCreate = !!user && canEditItem(user.globalRole) && !archived;
  const error = project.error ?? statuses.error ?? items.error;
  const refreshing = items.isRefetching || statuses.isRefetching;
  const refresh = () => void Promise.all([items.refetch(), statuses.refetch(), project.refetch()]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: project.data ? `${project.data.icon ?? ''} ${project.data.name}`.trim() : '' }} />

      <View style={styles.toolbar}>
        <Segmented value={view} onChange={setView} />
        {archived && <Text style={styles.archived}>Arquivado · somente leitura</Text>}
      </View>

      {statuses.isPending || items.isPending ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />
      ) : error ? (
        <Text style={styles.empty}>{errorMessage(error)}</Text>
      ) : view === 'board' ? (
        <Board columns={columns} titleById={titleById} refreshing={refreshing} onRefresh={refresh} />
      ) : (
        <SectionList
          sections={columns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
          }
          renderSectionHeader={({ section }) => <ColumnHeader status={section.status} count={section.data.length} />}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 8 }}>
              <ItemCard item={item} parentTitle={item.parentId ? titleById.get(item.parentId) : undefined} />
            </View>
          )}
        />
      )}

      {canCreate && (
        <Pressable
          style={({ pressed }) => [styles.fab, { bottom: 20 + insets.bottom }, pressed && { backgroundColor: colors.primaryPressed }]}
          onPress={() => router.push({ pathname: '/projects/[projectId]/new-item', params: { projectId } })}
          accessibilityLabel="Novo item"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

function Segmented({ value, onChange }: { value: View_; onChange: (v: View_) => void }) {
  return (
    <View style={styles.segmented}>
      {(
        [
          ['board', 'Quadro'],
          ['list', 'Lista'],
        ] as const
      ).map(([key, label]) => (
        <Pressable key={key} onPress={() => onChange(key)} style={[styles.segment, value === key && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === key && styles.segmentTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ColumnHeader({ status, count }: { status: Status; count: number }) {
  return (
    <View style={styles.columnHeader}>
      <View style={[styles.dot, { backgroundColor: categoryColors[status.category] }]} />
      <Text style={styles.columnTitle}>{status.name}</Text>
      <Text style={styles.columnCount}>{count}</Text>
    </View>
  );
}

function Board({
  columns,
  titleById,
  refreshing,
  onRefresh,
}: {
  columns: { status: Status; data: WorkItem[] }[];
  titleById: Map<string, string>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { width } = useWindowDimensions();
  // Coluna um pouco mais estreita que a tela, para a próxima "espiar" e indicar que há mais.
  const columnWidth = Math.min(width * 0.85, 360);
  const gap = 12;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={columnWidth + gap}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16, gap, paddingBottom: 8 }}
    >
      {columns.map(({ status, data }) => (
        <View key={status.id} style={[styles.column, { width: columnWidth }]}>
          <ColumnHeader status={status} count={data.length} />
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 96 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
            }
            ListEmptyComponent={<Text style={styles.columnEmpty}>Nenhum item</Text>}
            renderItem={({ item }) => (
              <ItemCard item={item} parentTitle={item.parentId ? titleById.get(item.parentId) : undefined} />
            )}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  archived: { fontSize: 12, color: colors.textFaint },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 2,
  },
  segment: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4 },
  segmentActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  segmentTextActive: { color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  column: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)', // slate-900/50, como as colunas do board web
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  columnTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  columnCount: { fontSize: 13, color: colors.textFaint },
  columnEmpty: { fontSize: 13, color: colors.textFaint, textAlign: 'center', paddingVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '400' },
});
