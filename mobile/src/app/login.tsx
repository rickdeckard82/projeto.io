import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { checkServer, errorCode, errorMessage } from '../api/client';
import { TurnstileModal } from '../components/TurnstileModal';
import { getServerUrl, normalizeServerUrl, setServerUrl } from '../lib/session';
import { colors } from '../lib/theme';

/**
 * Login em etapas: servidor (só no primeiro acesso ou ao trocar — não há endereço padrão, cada
 * organização hospeda o seu Projeto.io e ele pode mudar) → credenciais → (se a conta tiver 2FA)
 * código do app autenticador ou de recuperação. Se o backend exigir o Turnstile, abre o
 * {@link TurnstileModal} e repete o login com o token.
 */
export default function LoginScreen() {
  const { login, verifyTwoFactor } = useAuth();
  const [serverUrl, setServerUrlState] = useState(getServerUrl());
  const [editingServer, setEditingServer] = useState(!getServerUrl());
  const [serverInput, setServerInput] = useState(getServerUrl() ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitServer() {
    setError(null);
    setBusy(true);
    try {
      const url = normalizeServerUrl(serverInput);
      if (!(await checkServer(url))) {
        setError('Não encontramos um Projeto.io nesse endereço. Confira o endereço e a conexão.');
        return;
      }
      await setServerUrl(url);
      setServerUrlState(url);
      setServerInput(url);
      setEditingServer(false);
    } finally {
      setBusy(false);
    }
  }

  async function submitCredentials(turnstileToken?: string | null) {
    setError(null);
    setBusy(true);
    try {
      const outcome = await login(email.trim(), password, turnstileToken);
      if (outcome.status === 'twoFactor') setChallengeToken(outcome.challengeToken);
    } catch (e) {
      const c = errorCode(e);
      if (c === 'TURNSTILE_REQUIRED' || (c === 'TURNSTILE_FAILED' && !turnstileToken)) {
        setTurnstileOpen(true);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (!challengeToken) return;
    setError(null);
    setBusy(true);
    try {
      await verifyTwoFactor(challengeToken, code.trim(), rememberDevice);
    } catch (e) {
      setError(errorMessage(e));
      // Desafio expira em 5 min — nesse caso o backend manda refazer o login.
      if (errorMessage(e).includes('expirada')) setChallengeToken(null);
    } finally {
      setBusy(false);
    }
  }

  const step = editingServer ? 'server' : challengeToken ? 'twoFactor' : 'credentials';
  const canSubmit =
    step === 'server'
      ? serverInput.trim() !== ''
      : step === 'twoFactor'
        ? code.trim().length >= 6
        : email.trim() !== '' && password !== '';

  function submit() {
    if (step === 'server') submitServer();
    else if (step === 'twoFactor') submitCode();
    else submitCredentials();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Projeto.io</Text>
          <View style={styles.card}>
            {step === 'server' ? (
              <>
                <Text style={styles.title}>Servidor</Text>
                <Text style={styles.muted}>Informe o endereço do Projeto.io da sua organização.</Text>
                <TextInput
                  style={styles.input}
                  value={serverInput}
                  onChangeText={setServerInput}
                  placeholder="projeto.suaempresa.com.br"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  editable={!busy}
                  onSubmitEditing={() => canSubmit && submitServer()}
                />
              </>
            ) : step === 'twoFactor' ? (
              <>
                <Text style={styles.title}>Verificação em duas etapas</Text>
                <Text style={styles.muted}>Digite o código do app autenticador ou um código de recuperação.</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  editable={!busy}
                />
                <View style={styles.switchRow}>
                  <Switch value={rememberDevice} onValueChange={setRememberDevice} trackColor={{ true: colors.primaryLight }} />
                  <Text style={styles.switchLabel}>Lembrar este dispositivo por 30 dias</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Entrar</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!busy}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Senha"
                  secureTextEntry
                  autoComplete="password"
                  editable={!busy}
                  onSubmitEditing={() => canSubmit && submit()}
                />
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setEditingServer(true);
                  }}
                >
                  <Text style={styles.link}>
                    {serverUrl?.replace(/^https?:\/\//, '')} · trocar servidor
                  </Text>
                </Pressable>
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, (!canSubmit || busy) && styles.buttonDisabled]}
              disabled={!canSubmit || busy}
              onPress={submit}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 'server' ? 'Continuar' : step === 'twoFactor' ? 'Verificar' : 'Entrar'}
                </Text>
              )}
            </Pressable>

            {step === 'twoFactor' && (
              <Pressable
                onPress={() => {
                  setChallengeToken(null);
                  setCode('');
                  setError(null);
                }}
              >
                <Text style={[styles.link, { textAlign: 'center' }]}>Voltar</Text>
              </Pressable>
            )}
            {step === 'server' && serverUrl && (
              <Pressable
                onPress={() => {
                  setServerInput(serverUrl);
                  setError(null);
                  setEditingServer(false);
                }}
              >
                <Text style={[styles.link, { textAlign: 'center' }]}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TurnstileModal
        visible={turnstileOpen}
        onCancel={() => setTurnstileOpen(false)}
        onToken={(token) => {
          setTurnstileOpen(false);
          submitCredentials(token);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { color: '#fff', fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { color: colors.text, flex: 1 },
  link: { color: colors.primary, fontSize: 13 },
  error: { color: colors.danger },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
