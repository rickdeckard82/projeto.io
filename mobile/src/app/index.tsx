import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { errorCode, errorMessage } from '../api/client';
import { listProjects } from '../api/projects';
import { colors } from '../lib/theme';
import { Project } from '../types';

/** Projetos ativos do usuário (mesma lista do Sidebar/`/projects` do web). */
export default function ProjectsScreen() {
  const { user, logout } = useAuth();
  const projects = useQuery({ queryKey: ['projects', { archived: false }], queryFn: () => listProjects(false) });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={logout} hitSlop={8}>
              <Text style={styles.headerAction}>Sair</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={projects.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={projects.isRefetching}
            onRefresh={() => void projects.refetch()}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={<Text style={styles.greeting}>Olá, {user?.fullName.split(' ')[0]}</Text>}
        ListEmptyComponent={
          projects.isPending ? undefined : (
            <Text style={styles.empty}>
              {projects.isError
                ? errorCode(projects.error) === 'TWO_FACTOR_REQUIRED'
                  ? 'Contas de administrador precisam ativar a verificação em duas etapas. Faça isso pela versão web e entre de novo.'
                  : errorMessage(projects.error)
                : 'Você ainda não participa de nenhum projeto.'}
            </Text>
          )
        }
        renderItem={({ item }) => <ProjectRow project={item} />}
      />
    </>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: '/projects/[projectId]', params: { projectId: project.id } })}
    >
      <View style={[styles.icon, { backgroundColor: project.coverColor ?? colors.primaryLight }]}>
        <Text style={styles.iconText}>{project.icon ?? project.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        {project.key && <Text style={styles.key}>{project.key}</Text>}
        {project.description && (
          <Text style={styles.description} numberOfLines={2}>
            {project.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerAction: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  greeting: { fontSize: 22, fontWeight: '600', color: colors.text, marginBottom: 6 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  key: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  description: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
