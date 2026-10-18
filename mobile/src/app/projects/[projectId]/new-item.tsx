import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../../api/client';
import { createItem } from '../../../api/items';
import { listStatuses } from '../../../api/projects';
import { queryKeys } from '../../../api/queryKeys';
import { ChipSelect } from '../../../components/ChipSelect';
import { Button, ErrorText, FieldLabel, Input } from '../../../components/ui';
import { categoryColors, colors, priorityColors, priorityLabels } from '../../../lib/theme';
import { Priority } from '../../../types';

const PRIORITIES: Priority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Criação rápida de item. Sem status escolhido, o backend coloca na primeira coluna do projeto
 * (menor `position`), como no web. Responsáveis, etiquetas e datas ficam para o detalhe do item.
 */
export default function NewItemScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('NONE');
  const [statusId, setStatusId] = useState<string | undefined>();

  const statuses = useQuery({ queryKey: queryKeys.statuses(projectId), queryFn: () => listStatuses(projectId) });
  const sortedStatuses = [...(statuses.data ?? [])].sort((a, b) => a.position - b.position);

  const create = useMutation({
    mutationFn: () =>
      createItem(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        statusId: statusId ?? sortedStatuses[0]?.id,
      }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items(projectId) });
      router.replace({ pathname: '/items/[itemId]', params: { itemId: item.id } });
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <FieldLabel>Título</FieldLabel>
          <Input value={title} onChangeText={setTitle} placeholder="O que precisa ser feito?" autoFocus />
        </View>

        <View>
          <FieldLabel>Descrição (markdown)</FieldLabel>
          <Input
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            style={styles.description}
            placeholder="Opcional"
          />
        </View>

        <View>
          <FieldLabel>Prioridade</FieldLabel>
          <ChipSelect
            options={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p], color: priorityColors[p] }))}
            value={priority}
            onChange={setPriority}
          />
        </View>

        {sortedStatuses.length > 0 && (
          <View>
            <FieldLabel>Coluna</FieldLabel>
            <ChipSelect
              options={sortedStatuses.map((s) => ({ value: s.id, label: s.name, color: categoryColors[s.category] }))}
              value={statusId ?? sortedStatuses[0]?.id}
              onChange={setStatusId}
            />
          </View>
        )}

        {create.isError && <ErrorText>{errorMessage(create.error)}</ErrorText>}

        <Button title="Criar item" onPress={() => create.mutate()} disabled={!title.trim()} loading={create.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 18, backgroundColor: colors.background, flexGrow: 1 },
  description: { minHeight: 110 },
});
