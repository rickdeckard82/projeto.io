import { IsOptional, IsString, Matches, MinLength, registerDecorator, ValidationOptions } from 'class-validator';

/** Valida que a string é um fuso horário IANA reconhecido (ex.: "America/Sao_Paulo") — usa o próprio `Intl` do runtime como fonte da verdade em vez de manter uma lista estática, que ficaria desatualizada. */
function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          try {
            new Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'Fuso horário inválido';
        },
      },
    });
  };
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.+)?$/, { message: 'A URL da imagem deve começar com http:// ou https://' })
  avatarUrl?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;
}
