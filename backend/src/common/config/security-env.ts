import { Logger } from '@nestjs/common';

const logger = new Logger('SecurityEnv');

/**
 * Valores de exemplo que aparecem no `.env.example` da raiz e nos fallbacks `|| 'dev-*-secret'`
 * espalhados pelo código de auth. Nenhum deles pode ser usado de verdade em produção — se algum
 * estiver ativo, qualquer pessoa que leia o repositório sabe o segredo.
 */
const PLACEHOLDER_VALUES = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'dev-access-secret',
  'dev-refresh-secret',
  'change-me-generate-with-openssl-rand-base64-32',
  'ChangeMe123!',
]);

const MIN_SECRET_LENGTH = 32;

/**
 * Confere, na subida da aplicação, que os segredos sensíveis (`JWT_ACCESS_SECRET`,
 * `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, e `SEED_ADMIN_PASSWORD` em produção) não estão
 * ausentes, com valor de exemplo, iguais entre si ou curtos demais.
 *
 * Com `NODE_ENV=production` qualquer problema **aborta o boot** — é deliberado: melhor a API
 * não subir do que subir assinando tokens com `dev-access-secret` (que está no código-fonte
 * público) ou criando um admin com a senha padrão. Fora de produção, só registra um aviso.
 */
export function validateSecurityEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const problems: string[] = [];

  const requireStrongSecret = (name: string) => {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      problems.push(`${name} não está definida.`);
      return;
    }
    if (PLACEHOLDER_VALUES.has(value)) {
      problems.push(`${name} está com um valor de exemplo — troque por um valor aleatório (ex.: \`openssl rand -base64 48\`).`);
      return;
    }
    if (value.length < MIN_SECRET_LENGTH) {
      problems.push(`${name} tem menos de ${MIN_SECRET_LENGTH} caracteres — use um valor aleatório mais longo.`);
    }
  };

  requireStrongSecret('JWT_ACCESS_SECRET');
  requireStrongSecret('JWT_REFRESH_SECRET');

  if (
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    problems.push('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são iguais — use segredos diferentes.');
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.trim() === '') {
    problems.push('ENCRYPTION_KEY não está definida.');
  } else if (PLACEHOLDER_VALUES.has(encryptionKey)) {
    problems.push('ENCRYPTION_KEY está com o valor de exemplo — gere com `openssl rand -base64 32`.');
  } else if (Buffer.from(encryptionKey, 'base64').length !== 32) {
    problems.push('ENCRYPTION_KEY não decodifica para exatamente 32 bytes em base64 — gere com `openssl rand -base64 32`.');
  }

  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (isProd && (!seedAdminPassword || PLACEHOLDER_VALUES.has(seedAdminPassword))) {
    problems.push('SEED_ADMIN_PASSWORD ausente ou igual ao padrão inseguro (ChangeMe123!).');
  }

  if (problems.length === 0) {
    return;
  }

  const summary = ['Configuração de segurança inválida:', ...problems.map((p) => `  - ${p}`)].join('\n');
  if (isProd) {
    throw new Error(`${summary}\nCorrija o .env antes de subir em produção.`);
  }
  logger.warn(`${summary}\n(tolerado em desenvolvimento; com NODE_ENV=production isso abortaria a subida.)`);
}

/** Segredo do access token (fallback só para desenvolvimento — `validateSecurityEnv` barra em produção). */
export const jwtAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
export const jwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
/** Segredo próprio do token de desafio do 2FA: diferente do access, para o desafio nunca valer como sessão. */
export const twoFactorChallengeSecret = () => `${jwtAccessSecret()}:2fa-challenge`;
