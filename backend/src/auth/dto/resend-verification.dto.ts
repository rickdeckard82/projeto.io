import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';

export class ResendVerificationDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
