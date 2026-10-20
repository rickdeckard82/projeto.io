import { stat } from 'fs/promises';
import { Client, FTPError } from 'basic-ftp';

export const FILE_PREFIX = 'projetoio-banco';
export const BACKUP_NAME_PATTERN = /^projetoio-banco-\d{8}-\d{6}\.sql\.gz$/;
const FTP_TIMEOUT_MS = 60_000;

export interface FtpTarget {
  host: string;
  port: number;
  user: string | null;
  password: string | null;
  directory: string | null;
  tls: boolean;
}

export async function connectFtp(target: FtpTarget): Promise<Client> {
  const client = new Client(FTP_TIMEOUT_MS);
  try {
    await client.access({
      host: target.host,
      port: target.port,
      user: target.user || 'anonymous',
      password: target.password ?? '',
      // FTPS explícito, canal de dados também cifrado (PROT P). Sem validar o certificado, como
      // o ftplib do Ofícios RPZ: servidores de backup costumam usar certificado autoassinado.
      secure: target.tls,
      secureOptions: target.tls ? { rejectUnauthorized: false } : undefined,
    });
    const directory = target.directory?.trim();
    if (directory) {
      await client.ensureDir(directory); // cria se não existir e entra nela
    }
    return client;
  } catch (err) {
    client.close();
    throw err;
  }
}

/**
 * Envia como `.part`, confere o tamanho (quando o servidor tem SIZE) e renomeia para o nome final.
 * Em destino só de gravação (ex.: Pulse Backup), que não aceita SIZE, DELE nem renomear, vai
 * direto com o nome final e o 226 do STOR confirma o recebimento.
 */
export async function uploadFile(client: Client, localPath: string, remoteName: string, writeOnly: boolean) {
  if (writeOnly) {
    await client.uploadFrom(localPath, remoteName);
    return;
  }
  const partial = `${remoteName}.part`;
  await client.uploadFrom(localPath, partial);
  const expected = (await stat(localPath)).size;
  let remoteSize: number | null = null;
  try {
    remoteSize = await client.size(partial);
  } catch (err) {
    if (!(err instanceof FTPError)) throw err; // servidor sem SIZE: confia no 226 do STOR
  }
  if (remoteSize !== null && remoteSize !== expected) {
    throw new Error(`${remoteName}: enviado com ${remoteSize} bytes, esperado ${expected}.`);
  }
  await client.remove(remoteName, true);
  await client.rename(partial, remoteName);
}

/** Nomes dos backups desta aplicação na pasta atual, do mais recente para o mais antigo. */
export async function listBackups(client: Client): Promise<string[]> {
  try {
    const entries = await client.list();
    return entries
      .map((entry) => entry.name.split('/').pop() ?? '')
      .filter((name) => BACKUP_NAME_PATTERN.test(name))
      .sort()
      .reverse();
  } catch (err) {
    if (err instanceof FTPError) return []; // alguns servidores respondem 550 para pasta vazia
    throw err;
  }
}

/** Mantém só as `keepCount` cópias mais recentes. Devolve os nomes apagados. */
export async function pruneBackups(client: Client, keepCount: number): Promise<string[]> {
  const removed: string[] = [];
  for (const name of (await listBackups(client)).slice(keepCount)) {
    await client.remove(name);
    removed.push(name);
  }
  return removed;
}

export function describeError(err: unknown): string {
  if (err instanceof FTPError) {
    return err.code === 530 ? `Login FTP recusado: ${err.message}` : `FTP ${err.message}`;
  }
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}
