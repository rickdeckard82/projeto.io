import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota (ou controller inteiro) como pública, fazendo o
 * `JwtAuthGuard` pular a exigência de JWT válido para ela.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
