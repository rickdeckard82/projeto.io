import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';

/**
 * Origem do servidor WebSocket: o mesmo host/porta da API REST, mas sem o prefixo `/api/v1`
 * (o Socket.IO escuta na raiz do servidor Nest, não sob o prefixo global das rotas HTTP).
 */
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Conexão única de WebSocket compartilhada por toda a aplicação (real-time de mudanças em
 * itens de trabalho — ver `RealtimeGateway` no backend). `withCredentials` envia o cookie
 * httpOnly `access_token` no handshake, usado pelo gateway para autenticar a conexão.
 * `autoConnect: false` evita abrir a conexão antes de haver uma sessão autenticada; quem
 * precisa dela chama `.connect()` (idempotente, socket.io ignora se já conectado).
 */
export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});
