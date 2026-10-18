import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../api/client';
import { getServerUrl, getTokens } from './session';

/**
 * Conexão Socket.IO única da sessão (equivalente a `frontend/src/lib/socket.ts`). Sem cookies no
 * app, o access token vai em `auth.token` — a função é reavaliada a cada (re)conexão, então pega
 * sempre o token mais recente. Criada sob demanda porque o servidor só é conhecido após o login.
 */
let socket: Socket | null = null;
let socketServer: string | null = null;
const joinedProjects = new Map<string, number>();

function createSocket(serverUrl: string): Socket {
  const s = io(serverUrl, {
    transports: ['websocket'],
    autoConnect: false,
    auth: (cb) => cb({ token: getTokens()?.accessToken }),
  });

  // Salas não sobrevivem a uma reconexão: reentra em todas as que alguma tela está ouvindo.
  s.on('connect', () => {
    for (const projectId of joinedProjects.keys()) s.emit('join-project', projectId);
  });

  // O servidor derruba o handshake com token expirado (access token dura 15 min). Uma chamada
  // autenticada qualquer faz o interceptor do axios renovar a sessão; aí reconecta.
  s.on('disconnect', async (reason) => {
    if (reason !== 'io server disconnect' || !getTokens()) return;
    try {
      await apiClient.get('/auth/me');
      s.connect();
    } catch {
      // Sessão encerrada — o AuthContext já cuida de voltar ao login.
    }
  });

  return s;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket() {
  const serverUrl = getServerUrl();
  if (!serverUrl) return;
  if (socket && socketServer !== serverUrl) disconnectSocket();
  if (!socket) {
    socket = createSocket(serverUrl);
    socketServer = serverUrl;
  }
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
  socketServer = null;
  joinedProjects.clear();
}

/** Entra na sala do projeto (contagem de referências: várias telas podem ouvir o mesmo projeto). */
export function joinProject(projectId: string) {
  joinedProjects.set(projectId, (joinedProjects.get(projectId) ?? 0) + 1);
  if (socket?.connected) socket.emit('join-project', projectId);
}

export function leaveProject(projectId: string) {
  const count = (joinedProjects.get(projectId) ?? 1) - 1;
  if (count > 0) {
    joinedProjects.set(projectId, count);
    return;
  }
  joinedProjects.delete(projectId);
  socket?.emit('leave-project', projectId);
}

// O Android pode derrubar o WebSocket com o app em segundo plano — ao voltar, reconecta.
AppState.addEventListener('change', (state) => {
  if (state === 'active' && socket && !socket.connected && getTokens()) socket.connect();
});
