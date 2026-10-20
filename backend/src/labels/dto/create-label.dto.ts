import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex, ex: #3B82F6' })
  color: string;
}
