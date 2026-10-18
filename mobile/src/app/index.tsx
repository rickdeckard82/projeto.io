import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { errorCode, errorMessage } from '../api/client';
import { listProjects } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/ui';
import { colors } from '../lib/theme';
import { Project } from '../types';

/** Projetos ativos do usuário (mesma lista do Sidebar/`/projects` do web). */
export default function ProjectsScreen() {
  const { user, logout } = useAuth();
  const projects = useQuery({ queryKey: queryKeys.projects(false), queryFn: () => listProjects(false) });

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <Logo height={26} />,
          headerRight: () => (
            <Pressable onPress={logout} hitSlop={8} style={styles.headerRight}>
              {user && <Avatar name={user.fullName} size={26} />}
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
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>Olá, {user?.fullName.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>Seus projetos</Text>
          </View>
        }
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
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/projects/[projectId]', params: { projectId: project.id } })}
    >
      <View style={[styles.cover, { backgroundColor: project.coverColor ?? colors.primary }]} />
      <View style={styles.cardBody}>
        <View style={styles.icon}>
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAction: { color: colors.textSecondary, fontWeight: '500' },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  greeting: { fontSize: 22, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, paddingHorizontal: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPressed: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
  cover: { height: 6 },
  cardBody: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  iconText: { fontSize: 18, color: colors.text, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  key: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  description: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
