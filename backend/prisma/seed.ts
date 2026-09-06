import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, GlobalRole } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  // Em produção, recusa criar o admin com a senha de exemplo — melhor não ter admin (e o
  // operador perceber que não consegue entrar) do que ter um admin com senha pública.
  if (process.env.NODE_ENV === 'production' && (!process.env.SEED_ADMIN_PASSWORD || adminPassword === 'ChangeMe123!')) {
    throw new Error(
      'SEED_ADMIN_PASSWORD ausente ou igual ao padrão inseguro (ChangeMe123!) com NODE_ENV=production. ' +
        'Defina uma senha forte no .env antes do primeiro deploy — o admin não será criado até isso.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      fullName: 'Administrador',
      globalRole: GlobalRole.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Seeded admin user:');
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
