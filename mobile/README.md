# Projeto.io — app Android

App nativo (React Native + **Expo SDK 57**, Expo Router) que consome a mesma API do frontend web. O SDK fica no 57 de propósito: é o que o Expo Go publicado suporta (o site oferece o 58, mas o APK baixado ainda é do 57). Só suba o SDK depois de confirmar em Expo Go → Settings → "Supported SDKs". Antes de mexer em APIs do Expo, leia `mobile/AGENTS.md`: o Expo muda bastante a cada SDK.

## Estado atual

- Login com servidor informado no primeiro acesso (sem endereço padrão embutido, porque cada organização hospeda o seu e ele pode mudar; validado por `GET /api/v1/health`), 2FA (TOTP/código de recuperação, "lembrar dispositivo") e Turnstile via WebView
- Lista de projetos ativos
- Projeto em **Quadro** (colunas com rolagem horizontal) ou **Lista**, com criação de item
- Detalhe do item: título/descrição editáveis, status (com as mesmas travas do web), prioridade, responsáveis, etiquetas, datas, sub-itens, histórico e comentários
- Tempo real via Socket.IO (`src/lib/realtime.ts` + `src/hooks/useProjectRealtime.ts`)
- Visual igual ao web: tema escuro `slate` + `indigo` (`src/lib/theme.ts`), logo e ondas animadas. Ícone, ícone adaptativo/monocromático e splash em `assets/`, gerados do SVG do logo

Próximas fases: editar responsáveis/etiquetas/datas, notificações, documentos, notas, home ("meus itens").

## Como o app autentica

O app não usa cookies. Toda request leva `X-Client-Type: mobile`, e com isso o backend (`backend/src/auth/mobile-client.util.ts`):

- devolve `{ accessToken, refreshToken }` no corpo de `login`/`2fa/verify`/`refresh` (e `deviceToken` no 2FA com "lembrar dispositivo");
- lê o refresh token **só do corpo** em `refresh`/`logout`, nunca do cookie (assim um XSS no web não consegue trocar cookies por tokens legíveis);
- lê o dispositivo confiável do header `X-Device-Token`.

Os tokens ficam no `expo-secure-store` (`src/lib/session.ts`). O access token vai como `Authorization: Bearer`, e o interceptor em `src/api/client.ts` renova a sessão em qualquer 401. No Socket.IO o token vai em `io(url, { auth: { token } })`.

**Turnstile:** se o login responder `TURNSTILE_REQUIRED`, o app abre `<servidor>/mobile/turnstile` (`frontend/src/pages/MobileTurnstilePage.tsx`) numa WebView e recebe o token por `postMessage`. Por isso **o frontend web precisa estar publicado no mesmo endereço do servidor** configurado no app (o arranjo padrão do README, com `/api` e o site no mesmo domínio).

## Rodar em desenvolvimento

Não precisa de Node no host, tudo roda num container `node:20-alpine` com `mobile/` montado:

```bash
# instalar dependências (node_modules fica em mobile/, ignorado pelo git)
docker run --rm -v "<CAMINHO_ABSOLUTO>/mobile:/app" -w /app node:20-alpine npm ci

# checagem de tipos
docker run --rm -v "<CAMINHO_ABSOLUTO>/mobile:/app" -w /app node:20-alpine npx tsc --noEmit

# servidor de desenvolvimento: abra no celular com o Expo Go (mesma rede Wi-Fi)
docker run --rm -it -p 8081:8081 -e REACT_NATIVE_PACKAGER_HOSTNAME=<IP_DO_PC_NA_REDE> \
  -v "<CAMINHO_ABSOLUTO>/mobile:/app" -w /app node:20-alpine npx expo start
```

No primeiro acesso o app pede o endereço do servidor (o de teste é `projetoio.ehs.eti.br`; sem `https://` o app completa sozinho). Depois dá para trocar pelo link "trocar servidor" no login. Com o stack local (`docker compose up`), use `http://<IP_DO_PC_NA_REDE>:3000`; `localhost` no celular é o próprio celular. Isso exige `HOST_BIND_IP=0.0.0.0` no `.env` e funciona só sem Turnstile, porque a página `/mobile/turnstile` é servida pelo frontend na porta 5173, não pela API.

Para adicionar dependências use sempre `npx expo install <pacote>`, que resolve a versão compatível com o SDK.

## Gerar o APK

A pasta `android/` é gerada (Continuous Native Generation, está no `.gitignore`): configure tudo pelo `app.json`, nunca editando arquivos nativos à mão. Caminhos possíveis:

- **EAS Build** (nuvem, precisa de conta Expo): `npx eas-cli@latest build -p android --profile preview`
- **Local**: `npx expo prebuild -p android` e `./gradlew assembleRelease` dentro de `android/`. Precisa de JDK + Android SDK, que não estão instalados neste host (usar um container com o SDK).

O id do pacote é `br.com.projetoio` (`app.json`). Uma vez publicado na Play Store, ele não pode mais mudar.

## Versão

O app tem versão própria (`version` em `package.json` e `app.json`, mantidas iguais), independente do `APP_VERSION` web/backend, porque o ciclo de publicação na loja é separado.
