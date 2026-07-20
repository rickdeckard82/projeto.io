import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node dist/prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Só usado por `prisma migrate diff`/`migrate dev` (geração de migration); ausente em
    // runtime normal (generate/migrate deploy), então lido direto de process.env em vez de
    // `env()` — este último lança se a var não existir, o que quebraria todo comando prisma.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
