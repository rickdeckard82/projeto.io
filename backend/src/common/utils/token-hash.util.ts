import * as crypto from 'crypto';

/** Aplica SHA-256 sobre um token bruto antes de gravá-lo no banco, para nunca persistir tokens (refresh, verificação de e-mail) em texto plano. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
