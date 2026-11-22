// Testes das regras que a checagem de tipos não pega. Rodar com `npm test` (usa o node:test nativo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JwtService } from '@nestjs/jwt';
import { jwtAccessSecret, twoFactorChallengeSecret } from './common/config/security-env.js';
import { literalNow, startOfLiteralToday } from './backup/backup-schedule.util.js';
import { isPrivateAddress } from './notifications/channels/outbound-url.util.js';
import { addRecurrenceInterval } from './work-items/work-items.service.js';

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
