import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { getServerUrl } from '../lib/session';
import { colors } from '../lib/theme';

interface Props {
  visible: boolean;
  /** Token resolvido, ou `null` quando o servidor não tem Turnstile configurado (repetir sem token). */
  onToken: (token: string | null) => void;
  onCancel: () => void;
}

/**
 * Verificação anti-robô do login: abre numa WebView a página `/mobile/turnstile` do próprio
 * frontend web (`frontend/src/pages/MobileTurnstilePage.tsx`) — assim o widget roda no domínio já
 * autorizado para a site key, sem o app precisar conhecê-la — e recebe o token via `postMessage`.
 * Só é exibido quando o backend responde `TURNSTILE_REQUIRED`/`TURNSTILE_FAILED`.
 */
export function TurnstileModal({ visible, onToken, onCancel }: Props) {
  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; token?: string };
      if (msg.type === 'token' && msg.token) onToken(msg.token);
      else if (msg.type === 'disabled') onToken(null);
    } catch {
      // Mensagem que não veio da nossa página — ignora.
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Verificação de segurança</Text>
          <Text style={styles.subtitle}>Confirme que você não é um robô para continuar.</Text>
          <View style={styles.webviewBox}>
            {visible && (
              <WebView
                source={{ uri: `${getServerUrl()}/mobile/turnstile` }}
                onMessage={handleMessage}
                startInLoadingState
                renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
              />
            )}
          </View>
          <Pressable onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { marginTop: 4, color: colors.textMuted },
  webviewBox: { height: 140, marginVertical: 16, borderRadius: 8, overflow: 'hidden' },
  cancel: { alignSelf: 'center', padding: 8 },
  cancelText: { color: colors.primary, fontWeight: '600' },
});
