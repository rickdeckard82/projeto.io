import { IsOptional, IsString } from 'class-validator';

/**
 * Corpo opcional de `POST /auth/refresh` e `POST /auth/logout`. O frontend web não envia nada (o
 * refresh token vai no cookie httpOnly); o app mobile envia o refresh token aqui — ver
 * `isMobileClient` em `mobile-client.util.ts`.
 */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
