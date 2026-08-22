import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  /** Quando `true`, o dispositivo passa a pular o desafio de 2FA por 30 dias — ver `TwoFactorService.verifyChallenge`. */
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}
