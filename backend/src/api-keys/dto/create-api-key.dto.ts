import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  /** Dono da chave; só Admin pode informar outro usuário. Padrão: quem está criando. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
