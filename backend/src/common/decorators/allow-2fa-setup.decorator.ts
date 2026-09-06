import { SetMetadata } from '@nestjs/common';

export const ALLOW_2FA_SETUP_KEY = 'allow2faSetup';

/**
 * Marca um handler como acessível mesmo por um ADMIN que ainda não ativou o 2FA obrigatório
 * (ver `TwoFactorEnforcedGuard`). Só as rotas estritamente necessárias para sair desse estado
 * devem levar isto: ler a própria conta, configurar/ativar o 2FA e encerrar a sessão.
 */
export const Allow2faSetup = () => SetMetadata(ALLOW_2FA_SETUP_KEY, true);
