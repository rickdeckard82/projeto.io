import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { checkServer, errorCode, errorMessage } from '../api/client';
import { Logo } from '../components/Logo';
import { TurnstileModal } from '../components/TurnstileModal';
import { Button, Card, ErrorText, FieldLabel, Input } from '../components/ui';
import { Waves } from '../components/Waves';
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
      <Waves variant="auth" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Logo height={56} />
          </View>
          <Card style={styles.card}>
            {step === 'server' ? (
              <>
                <Text style={styles.title}>Servidor</Text>
                <Text style={styles.muted}>Informe o endereço do Projeto.io da sua organização.</Text>
                <View>
                  <FieldLabel>Endereço</FieldLabel>
                  <Input
                    value={serverInput}
                    onChangeText={setServerInput}
                    placeholder="projeto.suaempresa.com.br"
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    editable={!busy}
                    onSubmitEditing={() => canSubmit && submit()}
                  />
                </View>
              </>
            ) : step === 'twoFactor' ? (
              <>
                <Text style={styles.title}>Verificação em duas etapas</Text>
                <Text style={styles.muted}>Digite o código do app autenticador ou um código de recuperação.</Text>
                <View>
                  <FieldLabel>Código</FieldLabel>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    editable={!busy}
                    onSubmitEditing={() => canSubmit && submit()}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Switch
                    value={rememberDevice}
                    onValueChange={setRememberDevice}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                    thumbColor={colors.text}
                  />
                  <Text style={styles.switchLabel}>Lembrar este dispositivo por 30 dias</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Entrar</Text>
                <View>
                  <FieldLabel>E-mail</FieldLabel>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!busy}
                  />
                </View>
                <View>
                  <FieldLabel>Senha</FieldLabel>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                    editable={!busy}
                    onSubmitEditing={() => canSubmit && submit()}
                  />
                </View>
              </>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            <Button
              title={step === 'server' ? 'Continuar' : step === 'twoFactor' ? 'Verificar' : 'Entrar'}
              onPress={submit}
              disabled={!canSubmit}
              loading={busy}
            />

            {step === 'twoFactor' && (
              <TextLink
                label="Voltar"
                onPress={() => {
                  setChallengeToken(null);
                  setCode('');
                  setError(null);
                }}
              />
            )}
            {step === 'server' && serverUrl && (
              <TextLink
                label="Cancelar"
                onPress={() => {
                  setServerInput(serverUrl);
                  setError(null);
                  setEditingServer(false);
                }}
              />
            )}
          </Card>

          {step === 'credentials' && (
            <Pressable
              disabled={busy}
              onPress={() => {
                setError(null);
                setEditingServer(true);
              }}
              style={styles.serverRow}
            >
              <Text style={styles.serverText}>{serverUrl?.replace(/^https?:\/\//, '')}</Text>
              <Text style={styles.serverLink}>Trocar servidor</Text>
            </Pressable>
          )}
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

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { alignItems: 'center', marginBottom: 32 },
  card: { gap: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  link: { color: colors.accent, fontSize: 13, textAlign: 'center' },
  serverRow: { alignItems: 'center', marginTop: 20, gap: 2 },
  serverText: { color: colors.textFaint, fontSize: 12 },
  serverLink: { color: colors.accent, fontSize: 13 },
});
