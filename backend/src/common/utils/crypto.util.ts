import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY não configurada. Defina uma chave base64 de 32 bytes (ex.: `openssl rand -base64 32`).',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY inválida: deve decodificar para exatamente 32 bytes (256 bits) em base64.');
  }
  return key;
}

/**
 * Criptografa um texto (ex.: senha do SMTP) com AES-256-GCM, usando `ENCRYPTION_KEY` do ambiente.
 * Diferente de hash (usado para senhas de usuário/tokens), aqui o valor original precisa ser
 * recuperável — por isso criptografia simétrica reversível, não hashing.
 * @param plaintext - texto em claro a criptografar
 * @returns string base64 contendo `iv + authTag + ciphertext` concatenados
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Reverte {@link encrypt}, retornando o texto original.
 * @param encoded - string base64 produzida por {@link encrypt}
 * @returns texto em claro
 * @throws Error - se `ENCRYPTION_KEY` estiver ausente/incorreta ou o valor tiver sido adulterado (falha de autenticação do GCM)
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const buffer = Buffer.from(encoded, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buffer.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
