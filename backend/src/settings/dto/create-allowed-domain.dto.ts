import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateAllowedDomainDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
    message: 'Domínio inválido (ex.: suaempresa.com.br)',
  })
  domain: string;
}
