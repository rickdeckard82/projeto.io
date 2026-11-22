import { Transform } from 'class-transformer';

/** E-mail sem espaços e em minúsculas: o banco compara exatamente, então `Joao@X` e `joao@x` viravam contas diferentes. */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
