import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { BackupSettings } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt, encrypt } from '../common/utils/crypto.util.js';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto.js';
import { BackupRunnerService, missingConfig, SINGLETON_ID } from './backup-runner.service.js';
import { backupTimezone, nextRunAt } from './backup-schedule.util.js';
import { connectFtp, describeError, listBackups } from './backup-ftp.util.js';

type EditableFields = Omit<
  BackupSettings,
  'id' | 'runRequestedAt' | 'lastAttemptAt' | 'lastSuccessAt' | 'lastStatus' | 'lastMessage' | 'updatedAt'
>;

const DEFAULTS: EditableFields = {
  enabled: false,
  runTime: '02:30',
  keepCount: 7,
  ftpHost: null,
  ftpPort: 21,
  ftpUser: null,
  ftpPasswordEncrypted: null,
  ftpDirectory: null,
  ftpTls: true,
  ftpWriteOnly: false,
};

/**
 * Configuração do backup automático por FTP (`/settings/backup`). A senha do FTP nunca é
 * devolvida ao frontend, só o indicador `hasFtpPassword`.
 */
@Injectable()
export class BackupSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: BackupRunnerService,
  ) {}

  async get() {
    return this.serialize(await this.findOrDefault());
  }

  async update(dto: UpdateBackupSettingsDto) {
    const data = this.merge(await this.findOrDefault(), dto);
    if (data.enabled) {
      const problem = missingConfig(data);
      if (problem) throw new BadRequestException(problem);
    }
    const saved = await this.prisma.backupSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    return this.serialize(saved);
  }

  /** Testa a conexão com os dados do formulário (ainda não salvos), sem gravar nada. */
  async test(dto: UpdateBackupSettingsDto) {
    const data = this.merge(await this.findOrDefault(), dto);
    const problem = missingConfig(data);
    if (problem) throw new BadRequestException(problem);
    let existing = 0;
    try {
      const client = await connectFtp({
        host: data.ftpHost!,
        port: data.ftpPort,
        user: data.ftpUser,
        password: data.ftpPasswordEncrypted ? decrypt(data.ftpPasswordEncrypted) : null,
        directory: data.ftpDirectory,
        tls: data.ftpTls,
      });
      try {
        if (!data.ftpWriteOnly) existing = (await listBackups(client)).length;
      } finally {
        client.close();
      }
    } catch (err) {
      throw new BadGatewayException(`Falha na conexão: ${describeError(err)}`);
    }
    return {
      message: data.ftpWriteOnly
        ? 'Conexão OK. Destino só de gravação: as cópias antigas ficam no servidor de backup.'
        : `Conexão OK. ${existing} backup(s) desta aplicação na pasta.`,
    };
  }

  /** Pede uma execução imediata; o agendador a atende já (ou na próxima volta, se ocupado). */
  async requestRun() {
    const settings = await this.prisma.backupSettings.findUnique({ where: { id: SINGLETON_ID } });
    const problem = missingConfig(settings ?? DEFAULTS);
    if (!settings || problem) throw new BadRequestException(problem ?? 'Salve a configuração antes de executar.');
    const saved = await this.prisma.backupSettings.update({
      where: { id: SINGLETON_ID },
      data: { runRequestedAt: new Date() },
    });
    void this.runner.tick();
    return this.serialize(saved);
  }

  private async findOrDefault(): Promise<BackupSettings> {
    const settings = await this.prisma.backupSettings.findUnique({ where: { id: SINGLETON_ID } });
    return (
      settings ?? {
        id: SINGLETON_ID,
        ...DEFAULTS,
        runRequestedAt: null,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastStatus: null,
        lastMessage: null,
        updatedAt: new Date(),
      }
    );
  }

  private merge(current: BackupSettings, dto: UpdateBackupSettingsDto): EditableFields {
    const text = (value: string | undefined, fallback: string | null) =>
      value === undefined ? fallback : value.trim() || null;
    let ftpPasswordEncrypted = current.ftpPasswordEncrypted;
    if (dto.ftpPassword) ftpPasswordEncrypted = encrypt(dto.ftpPassword);
    else if (dto.clearFtpPassword) ftpPasswordEncrypted = null;
    return {
      enabled: dto.enabled ?? current.enabled,
      runTime: dto.runTime ?? current.runTime,
      keepCount: dto.keepCount ?? current.keepCount,
      ftpHost: text(dto.ftpHost, current.ftpHost),
      ftpPort: dto.ftpPort ?? current.ftpPort,
      ftpUser: text(dto.ftpUser, current.ftpUser),
      ftpPasswordEncrypted,
      ftpDirectory: text(dto.ftpDirectory, current.ftpDirectory),
      ftpTls: dto.ftpTls ?? current.ftpTls,
      ftpWriteOnly: dto.ftpWriteOnly ?? current.ftpWriteOnly,
    };
  }

  private serialize(settings: BackupSettings) {
    const { ftpPasswordEncrypted, id: _id, ...rest } = settings;
    return {
      ...rest,
      hasFtpPassword: !!ftpPasswordEncrypted,
      nextRunAt: nextRunAt(settings, new Date()),
      timezone: backupTimezone(),
    };
  }
}
