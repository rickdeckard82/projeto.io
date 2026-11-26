import { SetMetadata } from '@nestjs/common';

export const ALLOW_API_KEY = 'allowApiKey';

/**
 * Libera o handler para chave de API (`Authorization: Bearer pio_...`). Sem isto, o `JwtAuthGuard`
 * recusa a chave — rotas novas nascem fechadas para ela.
 */
export const AllowApiKey = () => SetMetadata(ALLOW_API_KEY, true);
