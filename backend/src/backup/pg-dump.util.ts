import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

const DUMP_TIMEOUT_MS = 30 * 60 * 1000;
const DUMP_COMPLETE_MARKER = '-- PostgreSQL database dump complete';

/**
 * Grava em `path` o `pg_dump` (SQL puro, comprimido com gzip) do banco de `DATABASE_URL`, sem
 * manter o dump em memória. `--clean --if-exists` faz o arquivo recriar as tabelas ao ser
 * restaurado com `psql`; `--no-owner --no-privileges` permite restaurar com outro usuário.
 * Falha se o dump não terminar com o marcador final do pg_dump (dump truncado).
 */
export async function writeDatabaseDump(path: string): Promise<void> {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL não definida.');
  const url = new URL(raw);
  const args = [
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', decodeURIComponent(url.username),
    '--dbname', decodeURIComponent(url.pathname.replace(/^\//, '')),
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ];
  const child = spawn('pg_dump', args, {
    // Senha por variável de ambiente, nunca na linha de comando (visível no `ps`).
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf8')).slice(-4000);
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), DUMP_TIMEOUT_MS);
  const exited = new Promise<number | null>((resolve, reject) => {
    child.on('error', (err: NodeJS.ErrnoException) =>
      reject(
        err.code === 'ENOENT'
          ? new Error('pg_dump não está instalado na imagem do backend (pacote postgresql16-client).')
          : err,
      ),
    );
    child.on('close', resolve);
  });

  let tail = '';
  const tailTap = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      tail = (tail + chunk.toString('utf8')).slice(-512);
      callback(null, chunk);
    },
  });

  try {
    const [code] = await Promise.all([exited, pipeline(child.stdout, tailTap, createGzip(), createWriteStream(path))]);
    if (code !== 0) {
      throw new Error(stderr.trim() || `pg_dump terminou com status ${code ?? 'interrompido (tempo limite)'}.`);
    }
  } finally {
    clearTimeout(timer);
  }
  if (!tail.includes(DUMP_COMPLETE_MARKER)) {
    throw new Error('Dump do banco incompleto (sem a linha final do pg_dump).');
  }
}
