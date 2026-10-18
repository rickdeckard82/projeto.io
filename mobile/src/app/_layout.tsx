import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { Waves } from '../components/Waves';
import { colors } from '../lib/theme';

// Mantém o splash (logo sobre slate-950) até sabermos se há sessão salva — evita piscar o login.
SplashScreen.preventAutoHideAsync();

/** Fundo do cabeçalho: slate-950 com borda slate-800 e as ondas baixas do `BarWaves` do web. */
function HeaderBackground() {
  return (
    <View style={styles.header}>
      <Waves variant="bar" />
    </View>
  );
}

function RootNavigator() {
  const { initializing, user } = useAuth();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  if (initializing) return null;

  // `Stack.Protected` só controla a navegação no cliente — a garantia de acesso é sempre o backend.
  return (
    <Stack
      screenOptions={{
        headerBackground: HeaderBackground,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" />
        <Stack.Screen name="projects/[projectId]/index" options={{ title: '' }} />
        <Stack.Screen name="projects/[projectId]/new-item" options={{ title: 'Novo item', presentation: 'modal' }} />
        <Stack.Screen name="items/[itemId]" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
});
