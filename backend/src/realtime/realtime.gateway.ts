import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

/**
 * Gateway WebSocket (Socket.IO) responsável por notificar, em tempo real, os navegadores
 * conectados a um projeto sobre mudanças nos itens de trabalho — sem isso, um usuário só via a
 * mudança feita por outro colega ao recarregar a página (não havia tempo real no v1, por decisão
 * documentada no CLAUDE.md; revertida aqui a pedido).
 *
 * Autenticação: a conexão só é aceita se o cookie httpOnly `access_token` (o mesmo do HTTP)
 * contiver um JWT válido — reaproveita o mesmo segredo/verificação do `JwtStrategy`, mas não pode
 * reusar o `JwtAuthGuard`/Passport diretamente porque o handshake do socket não passa pelo pipeline
 * HTTP de guards do Nest.
 *
 * Autorização por sala: cada projeto vira uma sala `project:<id>`; um cliente só entra nela se for
 * Admin, membro do projeto, ou o projeto for público — mesma regra de leitura do
 * `ProjectMemberGuard`, adaptada para não depender de uma request HTTP.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const cookies = parseCookies(client.handshake.headers.cookie);
    const token = cookies['access_token'];
    if (!token) {
      this.logger.warn(`Conexão recusada (sem access_token): ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      });
      client.data.userId = payload.sub;
    } catch {
      this.logger.warn(`Conexão recusada (token inválido/expirado): ${client.id}`);
      client.disconnect();
    }
  }

  @SubscribeMessage('join-project')
  async handleJoinProject(client: Socket, projectId: string) {
    const userId: string | undefined = client.data.userId;
    if (!userId || typeof projectId !== 'string') {
      return;
    }

    const allowed = await this.canReadProject(userId, projectId);
    if (allowed) {
      client.join(`project:${projectId}`);
    }
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(client: Socket, projectId: string) {
    if (typeof projectId === 'string') {
      client.leave(`project:${projectId}`);
    }
  }

  /** Notifica quem está na sala do projeto que a lista de itens mudou (criação, edição, mudança de status/responsáveis/etiquetas, exclusão). */
  emitItemsChanged(projectId: string) {
    this.server?.to(`project:${projectId}`).emit('items:changed', { projectId });
  }

  /** Notifica quem está na sala do projeto que o histórico de atividade/comentários de um item mudou. */
  emitActivityChanged(projectId: string, workItemId: string) {
    this.server?.to(`project:${projectId}`).emit('activity:changed', { workItemId });
  }

  private async canReadProject(userId: string, projectId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } });
    if (!user) {
      return false;
    }
    if (user.globalRole === GlobalRole.ADMIN) {
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (membership) {
      return true;
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { isPublic: true } });
    return !!project?.isPublic;
  }
}
