import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@udea.edu.co').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234';
  const name = process.env.ADMIN_NAME ?? 'SportSpace Admin';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.ADMIN },
    create: { email, name, passwordHash, role: Role.ADMIN },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
