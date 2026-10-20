import { apiClient } from './client';
import { BackupSettings } from '../types';

export interface BackupSettingsInput {
  enabled: boolean;
  runTime: string;
  keepCount: number;
  ftpHost: string;
  ftpPort: number;
  ftpUser: string;
  /** Em branco mantém a senha já salva. */
  ftpPassword?: string;
  clearFtpPassword?: boolean;
  ftpDirectory: string;
  ftpTls: boolean;
  ftpWriteOnly: boolean;
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const res = await apiClient.get('/settings/backup');
  return res.data;
}

export async function updateBackupSettings(data: BackupSettingsInput): Promise<BackupSettings> {
  const res = await apiClient.patch('/settings/backup', data);
  return res.data;
}

/** Testa a conexão FTP com os dados do formulário, sem salvar. */
export async function testBackupSettings(data: BackupSettingsInput): Promise<{ message: string }> {
  const res = await apiClient.post('/settings/backup/test', data);
  return res.data;
}

export async function runBackupNow(): Promise<BackupSettings> {
  const res = await apiClient.post('/settings/backup/run');
  return res.data;
}
