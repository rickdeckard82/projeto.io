import { useEffect } from 'react';
import { Turnstile, turnstileEnabled } from '../components/common/Turnstile';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

/** Mensagem enviada ao app mobile: `{ type: 'token', token }` quando resolvido, `{ type: 'disabled' }` sem site key. */
function postToApp(message: { type: 'token'; token: string } | { type: 'disabled' } | { type: 'error' }) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/**
 * Página mínima aberta numa WebView pelo app Android (`mobile/`) quando o login responde
 * `TURNSTILE_REQUIRED`: renderiza o mesmo widget do Turnstile do login web — no domínio já
 * autorizado para a site key e sob o CSP do `nginx.conf` — e devolve o token ao app via
 * `window.ReactNativeWebView.postMessage`. Fora da WebView não faz nada útil.
 */
export function MobileTurnstilePage() {
  useEffect(() => {
    if (!turnstileEnabled) postToApp({ type: 'disabled' });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <Turnstile onToken={(token) => postToApp(token ? { type: 'token', token } : { type: 'error' })} />
    </div>
  );
}
