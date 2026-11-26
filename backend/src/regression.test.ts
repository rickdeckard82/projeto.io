// Testes das regras que a checagem de tipos não pega. Rodar com `npm test` (usa o node:test nativo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ApiKeysService, isApiKeyIpAllowed } from './api-keys/api-keys.service.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { ProjectsController } from './projects/projects.controller.js';
import { UsersController } from './users/users.controller.js';
import { jwtAccessSecret, twoFactorChallengeSecret } from './common/config/security-env.js';
import { literalNow, startOfLiteralToday } from './backup/backup-schedule.util.js';
import { isPrivateAddress } from './notifications/channels/outbound-url.util.js';
import { addRecurrenceInterval, WorkItemsService } from './work-items/work-items.service.js';
import { ProjectMemberGuard } from './common/guards/project-member.guard.js';
import { UsersService } from './users/users.service.js';
import { hashToken } from './common/utils/token-hash.util.js';
import bcrypt from 'bcryptjs';

test('token de desafio do 2FA não vale como token de acesso', () => {
  const jwt = new JwtService();
  const challenge = jwt.sign({ sub: 'u1', purpose: '2fa' }, { secret: twoFactorChallengeSecret(), expiresIn: '5m' });
  assert.throws(() => jwt.verify(challenge, { secret: jwtAccessSecret() }));
});

test('recorrência mensal respeita o fim do mês', () => {
  const next = addRecurrenceInterval(new Date('2026-01-31T00:00:00.000Z'), 'MONTH', 1);
  assert.equal(next.toISOString().slice(0, 10), '2026-02-28');
});

test('prazo de hoje não conta como atrasado, e lembrete usa o relógio local', () => {
  const now = new Date('2026-07-26T00:30:00.000Z'); // 25/07 21:30 em São Paulo
  const due = new Date('2026-07-26T00:00:00.000Z'); // prazo literal "26/07"
  assert.equal(due < startOfLiteralToday(now, 'America/Sao_Paulo'), false);
  assert.equal(literalNow(now, 'America/Sao_Paulo').toISOString(), '2026-07-25T21:30:00.000Z');
});

test('webhook não alcança endereços internos', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.18.0.5', '192.168.1.1', '169.254.169.254', '::1', '::ffff:10.0.0.1', 'fd00::1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  assert.equal(isPrivateAddress('142.250.79.14'), false);
});

test('chave de API só entra em rota liberada, e nunca expirada, inativa ou de admin', async () => {
  const user = { id: 'u1', isActive: true, emailVerifiedAt: new Date(), globalRole: 'SENIOR' };
  const key = { id: 'k1', lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), user };
  const call = (record: unknown, handler: Function) => {
    const prisma = { apiKey: { findUnique: async () => record } };
    const guard = new JwtAuthGuard(new Reflector(), new ApiKeysService(prisma as any));
    const request = { headers: { authorization: 'Bearer pio_x' } };
    return guard.canActivate({
      getHandler: () => handler,
      getClass: () => Object,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any);
  };
  const allowed = ProjectsController.prototype.create;

  assert.equal(await call(key, allowed), true);
  await assert.rejects(call(key, UsersController.prototype.update), { status: 403 });
  await assert.rejects(call(key, ProjectsController.prototype.remove), { status: 403 });
  await assert.rejects(call(null, allowed), { status: 401 });
  await assert.rejects(call({ ...key, expiresAt: new Date(0) }, allowed), { status: 401 });
  await assert.rejects(call({ ...key, user: { ...user, isActive: false } }, allowed), { status: 401 });
  await assert.rejects(call({ ...key, user: { ...user, globalRole: 'ADMIN' } }, allowed), { status: 401 });
});

test('projeto público libera só leitura para quem não é membro', async () => {
  const call = (user: object, method: string, { member = false, isPublic = false } = {}) => {
    const prisma = {
      projectMember: { findUnique: async () => (member ? { userId: 'u1' } : null) },
      project: { findUnique: async () => ({ isPublic }) },
    };
    const request = { user, method, params: { projectId: 'p1' } };
    return new ProjectMemberGuard(new Reflector(), prisma as any).canActivate({
      getHandler: () => () => {},
      getClass: () => Object,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any);
  };
  const member = { id: 'u1', globalRole: 'MEMBER' };

  assert.equal(await call(member, 'GET', { isPublic: true }), true);
  await assert.rejects(call(member, 'POST', { isPublic: true }), { status: 403 });
  await assert.rejects(call(member, 'GET'), { status: 403 });
  assert.equal(await call(member, 'POST', { member: true }), true);
  assert.equal(await call({ id: 'a1', globalRole: 'ADMIN' }, 'DELETE'), true);
});

test('mudança de status respeita a trava e gera uma única próxima ocorrência', async () => {
  const statuses: Record<string, any> = {
    s0: { id: 's0', projectId: 'p1', category: 'BACKLOG', name: 'Backlog' },
    s1: { id: 's1', projectId: 'p1', category: 'STARTED', name: 'Em andamento' },
    s2: { id: 's2', projectId: 'p1', category: 'COMPLETED', name: 'Concluído' },
  };
  const item = {
    id: 'i1', projectId: 'p1', title: 'T', description: null, priority: 'NONE', moduleId: null, labels: [],
    statusId: 's1', status: statuses.s1, statusLockedById: 'u2', statusLockedBy: { fullName: 'Ana' },
    assignees: [{ userId: 'u1' }], inProgressSeconds: 0, inProgressSince: null,
    recurrenceUnit: 'WEEK', recurrenceInterval: 1, recurrenceEndsHere: false, recurrenceCount: 0,
    startDate: null, dueDate: new Date('2026-07-01T00:00:00.000Z'),
  };
  const created: any[] = [];
  let claimCount = 1;
  const prisma = {
    workItem: {
      findUnique: async () => item,
      findUniqueOrThrow: async () => item,
      findMany: async () => [],
      updateMany: async () => ({ count: claimCount }),
      create: async (args: any) => (created.push(args), { id: 'i2', title: 'T' }),
    },
    project: { findUnique: async () => ({ archivedAt: null }), findUniqueOrThrow: async () => ({ name: 'P' }) },
    status: { findUnique: async ({ where }: any) => statuses[where.id], findFirst: async () => statuses.s0 },
    itemActivity: { create: async () => ({}) },
  };
  const service = new WorkItemsService(
    prisma as any,
    { emitItemsChanged() {}, emitActivityChanged() {} } as any,
    { create: async () => ({}) } as any,
  );
  const u1 = { id: 'u1', email: 'u1@x', fullName: 'U1', globalRole: 'MEMBER', twoFactorEnabled: false } as any;

  // Travada por outra pessoa enquanto "Em andamento".
  await assert.rejects(service.updateStatus('i1', 's2', u1), { status: 403 });

  item.statusLockedById = 'u1';
  await service.updateStatus('i1', 's2', u1);
  assert.equal(created.length, 1);
  assert.equal(created[0].data.dueDate.toISOString().slice(0, 10), '2026-07-08');

  // Segundo "concluir" simultâneo perde a corrida e não gera outra ocorrência.
  claimCount = 0;
  await assert.rejects(service.updateStatus('i1', 's2', u1), { status: 409 });
  assert.equal(created.length, 1);
});

test('trocar a própria senha exige a atual e derruba as outras sessões', async () => {
  const passwordHash = await bcrypt.hash('senha-antiga', 4);
  const revoked: any[] = [];
  const prisma = {
    user: { findUnique: async () => ({ passwordHash }), update: async () => ({ id: 'u1' }) },
    refreshToken: { updateMany: (args: any) => (revoked.push(args), args) },
    trustedDevice: { deleteMany: (args: any) => args },
    apiKey: { deleteMany: (args: any) => args },
    $transaction: async (ops: unknown[]) => ops,
  };
  const service = new UsersService(prisma as any);
  const self = { id: 'u1', globalRole: 'SENIOR' } as any;

  await assert.rejects(service.update('u1', { password: 'senha-nova-123' }, self), { status: 400 });
  await assert.rejects(
    service.update('u1', { password: 'senha-nova-123', currentPassword: 'errada' }, self),
    { status: 400 },
  );
  await service.update('u1', { password: 'senha-nova-123', currentPassword: 'senha-antiga' }, self, 'rt-atual');
  assert.deepEqual(revoked[0].where.tokenHash, { not: hashToken('rt-atual') });

  // Admin trocando a senha de outro: não pede a atual e derruba todas as sessões dele.
  await service.update('u1', { password: 'senha-nova-123' }, { id: 'a1', globalRole: 'ADMIN' } as any, 'rt-admin');
  assert.equal(revoked[1].where.tokenHash, undefined);
});

test('chave de API só é aceita dos IPs permitidos, quando a lista existe', () => {
  const anthropic = '160.79.104.0/21';
  assert.equal(isApiKeyIpAllowed('203.0.113.9', ''), true);
  assert.equal(isApiKeyIpAllowed('160.79.111.200', anthropic), true);
  assert.equal(isApiKeyIpAllowed('::ffff:160.79.104.1', anthropic), true);
  assert.equal(isApiKeyIpAllowed('160.79.112.1', anthropic), false);
  assert.equal(isApiKeyIpAllowed(undefined, anthropic), false);
  assert.equal(isApiKeyIpAllowed('2001:db8::1', `${anthropic}, 2001:db8::/32`), true);
});
