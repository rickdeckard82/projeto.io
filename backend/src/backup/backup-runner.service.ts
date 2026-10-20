import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { mkdtemp, readdir, rm, stat, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { BackupSettings } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';
import { decrypt } from '../common/utils/crypto.util.js';
import { connectFtp, describeError, FILE_PREFIX, pruneBackups, uploadFile } from './backup-ftp.util.js';
import { fileStamp, isDue } from './backup-schedule.util.js';
import { writeDatabaseDump } from './pg-dump.util.js';

export const SINGLETON_ID = 'singleton';
const TEMP_PREFIX = 'projetoio-backup-';

export function missingConfig(settings: Pick<BackupSettings, 'ftpHost'>): string | null {
  return settings.ftpHost ? null : 'Servidor FTP não configurado.';
}

/**
 * Executa o backup agendado: a cada 30 s confere se está na hora (ou se foi pedido "Executar
 * agora") e, se sim, gera o dump, envia ao FTP e grava o resultado em `BackupSettings` e na
 * auditoria. Uma execução por vez (flag em memória — o backend roda numa réplica só).
 */
@Injectable()
export class BackupRunnerService implements OnModuleInit {
  private readonly logger = new Logger(BackupRunnerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    // Sobras de um processo que morreu no meio do backup: nada deve ficar no servidor.
    for (const name of await readdir(tmpdir())) {
      if (name.startsWith(TEMP_PREFIX)) {
        await rm(join(tmpdir(), name), { recursive: true, force: true });
        this.logger.warn(`Removida pasta temporária de backup interrompido: ${name}`);
      }
    }
    await this.prisma.backupSettings.updateMany({
      where: { lastStatus: 'running' },
      data: { lastStatus: 'error', lastMessage: 'Interrompido: o backend reiniciou durante o backup.' },
    });
  }

  @Interval(30_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.executeIfDue();
    } catch (err) {
      this.logger.error('Falha no agendador de backup', err instanceof Error ? err.stack : String(err));
    } finally {
      this.running = false;
    }
  }

  private async executeIfDue(): Promise<void> {
    const settings = await this.prisma.backupSettings.findUnique({ where: { id: SINGLETON_ID } });
    const now = new Date();
    if (!settings || !isDue(settings, now)) return;

    const trigger = settings.runRequestedAt ? 'manual' : 'agendado';
    await this.prisma.backupSettings.update({
      where: { id: SINGLETON_ID },
      data: { runRequestedAt: null, lastAttemptAt: now, lastStatus: 'running', lastMessage: null },
    });
    this.logger.log(`Backup FTP iniciando (${trigger})`);

    let status: 'success' | 'error';
    let message: string;
    let metadata: Record<string, string | number> = { trigger };
    try {
      const result = await this.runBackup(settings, now);
      status = 'success';
      message = `Enviado: ${result.fileName} (${formatBytes(result.bytes)})`;
      if (result.removed.length) message += `; ${result.removed.length} cópia(s) antiga(s) apagada(s)`;
      message += '.';
      metadata = { ...metadata, file: result.fileName, bytes: result.bytes, removed: result.removed.length };
    } catch (err) {
      status = 'error';
      message = describeError(err);
      metadata = { ...metadata, error: message.slice(0, 500) };
    }

    await this.prisma.backupSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        lastStatus: status,
        lastMessage: message.slice(0, 2000),
        ...(status === 'success' ? { lastSuccessAt: new Date() } : {}),
      },
    });
    await this.auditService.record({
      action: status === 'success' ? AUDIT_ACTIONS.BACKUP_RUN_SUCCEEDED : AUDIT_ACTIONS.BACKUP_RUN_FAILED,
      targetType: 'backup_settings',
      metadata,
    });
    if (status === 'success') this.logger.log(`Backup FTP: ${message}`);
    else this.logger.error(`Backup FTP: ${message}`);
  }

  private async runBackup(settings: BackupSettings, now: Date) {
    const problem = missingConfig(settings);
    if (problem) throw new Error(problem);
    const fileName = `${FILE_PREFIX}-${fileStamp(now)}.sql.gz`;
    // Nada fica no servidor da aplicação: o arquivo é apagado assim que enviado e a pasta
    // temporária some ao sair, com ou sem erro.
    const work = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
    try {
      const localPath = join(work, fileName);
      await writeDatabaseDump(localPath);
      const bytes = (await stat(localPath)).size;
      const client = await connectFtp({
        host: settings.ftpHost!,
        port: settings.ftpPort,
        user: settings.ftpUser,
        password: settings.ftpPasswordEncrypted ? decrypt(settings.ftpPasswordEncrypted) : null,
        directory: settings.ftpDirectory,
        tls: settings.ftpTls,
      });
      try {
        await uploadFile(client, localPath, fileName, settings.ftpWriteOnly);
        await unlink(localPath);
        // Só de gravação: não lista nem apaga; a retenção é a do servidor de backup.
        const removed = settings.ftpWriteOnly ? [] : await pruneBackups(client, settings.keepCount);
        return { fileName, bytes, removed };
      } finally {
        client.close();
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
