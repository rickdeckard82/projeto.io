import { ReactNode, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { errorMessage } from '../../api/client';
import { addItemComment, getItem, getItemActivities, updateItem, updateItemStatus } from '../../api/items';
import { listStatuses } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { ChipSelect } from '../../components/ChipSelect';
import { Avatar, Badge, Button, Card, ErrorText, Input } from '../../components/ui';
import { useProjectRealtime } from '../../hooks/useProjectRealtime';
import { describeActivity, formatInProgress, relativeTime } from '../../lib/format';
import { canEditItem, statusLockReason } from '../../lib/permissions';
import { categoryColors, colors, formatDate, priorityColors, priorityLabels } from '../../lib/theme';
import { Priority, WorkItem } from '../../types';

const PRIORITIES: Priority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Detalhe do item — equivalente ao `ItemDetailModal` do web: status, prioridade, título e descrição
 * editáveis, metadados, sub-itens, histórico e comentários. Ouve a sala do projeto para refletir
 * mudanças feitas por outras pessoas.
 */
export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const item = useQuery({ queryKey: queryKeys.item(itemId), queryFn: () => getItem(itemId) });
  const projectId = item.data?.projectId;
  const statuses = useQuery({
    queryKey: queryKeys.statuses(projectId ?? ''),
    queryFn: () => listStatuses(projectId!),
    enabled: !!projectId,
  });
  useProjectRealtime(projectId);

  /** Atualiza o cache do detalhe com a resposta e avisa a lista/quadro do projeto. */
  const applyUpdate = (updated: WorkItem) => {
    queryClient.setQueryData(queryKeys.item(itemId), (old: WorkItem | undefined) => ({ ...old, ...updated }));
    queryClient.invalidateQueries({ queryKey: queryKeys.items(updated.projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(itemId) });
  };

  const statusMutation = useMutation({ mutationFn: (statusId: string) => updateItemStatus(itemId, statusId), onSuccess: applyUpdate });
  const fieldsMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateItem>[1]) => updateItem(itemId, data),
    onSuccess: applyUpdate,
  });

  if (item.isPending) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />;
  if (item.isError || !user) return <Text style={styles.empty}>{errorMessage(item.error)}</Text>;

  const data = item.data;
  const canEdit = canEditItem(user.globalRole);
  const lockReason = statusLockReason(data, user);
  const inProgress = formatInProgress(data.inProgressSeconds ?? 0, data.inProgressSince);
  const sortedStatuses = [...(statuses.data ?? [])].sort((a, b) => a.position - b.position);
  const mutationError = statusMutation.error ?? fieldsMutation.error;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: data.status.name }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <EditableText
          value={data.title}
          editable={canEdit}
          saving={fieldsMutation.isPending}
          onSave={(title) => fieldsMutation.mutate({ title })}
          textStyle={styles.title}
        />

        {mutationError && <ErrorText>{errorMessage(mutationError)}</ErrorText>}

        <Section title="Status">
          {lockReason && <Text style={styles.lock}>🔒 {lockReason}</Text>}
          <ChipSelect
            options={sortedStatuses.map((s) => ({ value: s.id, label: s.name, color: categoryColors[s.category] }))}
            value={data.statusId}
            onChange={(statusId) => statusMutation.mutate(statusId)}
            disabled={!canEdit || !!lockReason || statusMutation.isPending}
          />
        </Section>

        <Section title="Prioridade">
          <ChipSelect
            options={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p], color: priorityColors[p] }))}
            value={data.priority}
            onChange={(priority) => fieldsMutation.mutate({ priority })}
            disabled={!canEdit || fieldsMutation.isPending}
          />
        </Section>

        <Card style={styles.details}>
          <Detail label="Responsáveis">
            {data.assignees.length === 0 ? (
              <Text style={styles.muted}>Ninguém</Text>
            ) : (
              <View style={styles.wrap}>
                {data.assignees.map(({ user: a }) => (
                  <View key={a.id} style={styles.person}>
                    <Avatar name={a.fullName} size={20} />
                    <Text style={styles.value}>{a.fullName}</Text>
                  </View>
                ))}
              </View>
            )}
          </Detail>
          {data.labels.length > 0 && (
            <Detail label="Etiquetas">
              <View style={styles.wrap}>
                {data.labels.map(({ label }) => (
                  <Badge key={label.id} label={label.name} color={label.color} />
                ))}
              </View>
            </Detail>
          )}
          {data.startDate && <Detail label="Início" text={formatDate(data.startDate)} />}
          {data.dueDate && <Detail label="Prazo" text={formatDate(data.dueDate)} />}
          {data.module && <Detail label="Módulo" text={data.module.name} />}
          {data.recurrenceUnit && <Detail label="Recorrência" text={recurrenceText(data)} />}
          {inProgress && <Detail label="Em andamento" text={inProgress} />}
          {data.createdBy && <Detail label="Criado por" text={`${data.createdBy.fullName} · ${relativeTime(data.createdAt)}`} />}
        </Card>

        <Section title="Descrição">
          <EditableText
            value={data.description ?? ''}
            placeholder="Sem descrição"
            multiline
            editable={canEdit}
            saving={fieldsMutation.isPending}
            onSave={(description) => fieldsMutation.mutate({ description })}
            textStyle={styles.description}
          />
        </Section>

        {data.subItems && data.subItems.length > 0 && (
          <Section title={`Sub-itens (${data.subItems.length})`}>
            {data.subItems.map((sub) => (
              <Pressable
                key={sub.id}
                onPress={() => router.push({ pathname: '/items/[itemId]', params: { itemId: sub.id } })}
                style={({ pressed }) => [styles.subItem, pressed && { backgroundColor: colors.surfaceRaised }]}
              >
                <View style={[styles.dot, { backgroundColor: categoryColors[sub.status.category] }]} />
                <Text style={styles.value} numberOfLines={1}>
                  {sub.title}
                </Text>
              </Pressable>
            ))}
          </Section>
        )}

        <Section title="Atividade">
          <ActivityFeed itemId={itemId} canComment={canEdit} />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function recurrenceText(item: WorkItem): string {
  const n = item.recurrenceInterval ?? 1;
  const unit = { DAY: ['dia', 'dias'], WEEK: ['semana', 'semanas'], MONTH: ['mês', 'meses'] }[item.recurrenceUnit!];
  return n === 1 ? `A cada ${unit[0]}` : `A cada ${n} ${unit[1]}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, text, children }: { label: string; text?: string; children?: ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children ?? <Text style={styles.value}>{text}</Text>}</View>
    </View>
  );
}

/** Texto que vira campo de edição ao tocar (se `editable`), com Salvar/Cancelar. */
function EditableText({
  value,
  placeholder,
  multiline,
  editable,
  saving,
  onSave,
  textStyle,
}: {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  editable: boolean;
  saving: boolean;
  onSave: (value: string) => void;
  textStyle: object;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <Pressable disabled={!editable} onPress={() => setDraft(value)}>
        <Text style={[textStyle, !value && styles.muted]}>{value || placeholder}</Text>
        {editable && <Text style={styles.editHint}>Toque para editar</Text>}
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Input
        value={draft}
        onChangeText={setDraft}
        autoFocus
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={multiline ? { minHeight: 120 } : undefined}
      />
      <View style={styles.editActions}>
        <Button title="Cancelar" variant="ghost" onPress={() => setDraft(null)} />
        <Button
          title="Salvar"
          loading={saving}
          disabled={!multiline && !draft.trim()}
          onPress={() => {
            if (draft.trim() !== value) onSave(multiline ? draft : draft.trim());
            setDraft(null);
          }}
        />
      </View>
    </View>
  );
}

function ActivityFeed({ itemId, canComment }: { itemId: string; canComment: boolean }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const activities = useQuery({ queryKey: queryKeys.itemActivities(itemId), queryFn: () => getItemActivities(itemId) });
  const send = useMutation({
    mutationFn: (message: string) => addItemComment(itemId, message),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(itemId) });
    },
  });

  return (
    <View style={{ gap: 12 }}>
      {activities.isPending && <ActivityIndicator color={colors.accent} />}
      {activities.data?.map((a) => (
        <View key={a.id} style={styles.activity}>
          <Avatar name={a.user.fullName} size={24} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.activityText}>
              <Text style={styles.activityUser}>{a.user.fullName}</Text> {describeActivity(a)}
              <Text style={styles.activityTime}> · {relativeTime(a.createdAt)}</Text>
            </Text>
            {a.type === 'COMMENT' && a.message && (
              <View style={styles.comment}>
                <Text style={styles.value}>{a.message}</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {canComment && (
        <View style={{ gap: 8 }}>
          <Input value={comment} onChangeText={setComment} placeholder="Escreva um comentário..." multiline />
          {send.isError && <ErrorText>{errorMessage(send.error)}</ErrorText>}
          <Button
            title="Comentar"
            variant="secondary"
            onPress={() => send.mutate(comment.trim())}
            disabled={!comment.trim()}
            loading={send.isPending}
            style={{ alignSelf: 'flex-end' }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20, paddingBottom: 48 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  editHint: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  lock: { fontSize: 12, color: '#facc15' },
  details: { gap: 12 },
  detailRow: { flexDirection: 'row', gap: 12 },
  detailLabel: { width: 100, fontSize: 13, color: colors.textMuted },
  value: { fontSize: 14, color: colors.textSecondary },
  muted: { color: colors.textFaint },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activity: { flexDirection: 'row', gap: 10 },
  activityText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  activityUser: { color: colors.text, fontWeight: '600' },
  activityTime: { color: colors.textFaint },
  comment: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
  },
});
