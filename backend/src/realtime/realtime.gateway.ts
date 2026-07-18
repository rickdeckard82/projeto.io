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

  /**
   * Autentica o handshake da conexão: exige um JWT de acesso válido no cookie `access_token`
   * (mesmo cookie httpOnly usado pelo HTTP). Sem token, ou com token inválido/expirado,
   * desconecta o socket imediatamente — sem isso, qualquer um poderia se conectar e escutar
   * eventos de projetos que não deveria ver. Guarda o `userId` decodificado em `client.data`
   * para as autorizações por sala feitas depois (`handleJoinProject`).
   * @param client - socket recém-conectado
   */
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

  /**
   * Entra na sala `project:<projectId>` se o usuário autenticado (`client.data.userId`) puder ler
   * o projeto — Admin, membro, ou projeto público (ver {@link canReadProject}). Sem autenticação
   * prévia (`handleConnection` falhou) ou sem autorização, não faz nada — o cliente simplesmente
   * não recebe os eventos daquela sala, sem erro explícito.
   * @param client - socket que está pedindo para entrar na sala
   * @param projectId - id do projeto cuja sala o cliente quer ouvir
   */
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

  /** Sai da sala `project:<projectId>` — chamado pelo frontend ao desmontar a página do projeto, para não continuar recebendo eventos de um projeto que não está mais sendo visto. */
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

  /**
   * Notifica quem está na sala do projeto que o próprio projeto mudou de estado (hoje, só usado
   * para arquivar/desarquivar) — sem isso, quem já estava com o board aberto continuava
   * arrastando/editando itens normalmente até recarregar a página, mesmo depois de outro usuário
   * arquivar o projeto. O cliente reage revalidando os dados do projeto e saindo da tela se ele
   * tiver acabado de ser arquivado.
   */
  emitProjectChanged(projectId: string) {
    this.server?.to(`project:${projectId}`).emit('project:changed', { projectId });
  }

  /**
   * Reimplementa, para o contexto de socket (sem `ExecutionContext`/request HTTP), a mesma regra
   * de leitura do `ProjectMemberGuard`: Admin sempre pode; membro do projeto pode; sem nenhum dos
   * dois, só se o projeto for público.
   * @param userId - id do usuário autenticado no socket
   * @param projectId - id do projeto que ele quer ouvir
   * @returns `true` se o usuário pode entrar na sala desse projeto
   */
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
