import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsNotEmpty()
  fullName: string;
}
