import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
