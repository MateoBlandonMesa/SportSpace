import { AvailabilityKind, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const WEEKDAYS = [1, 2, 3, 4, 5];

const demoSpaces = [
  {
    name: 'Pista sintetica',
    type: 'pista',
    campus: 'Ciudad Universitaria',
    capacity: 40,
    usageRules: 'Uso con reserva previa',
  },
  {
    name: 'Cancha de futbol 5',
    type: 'cancha',
    campus: 'Ciudad Universitaria',
    capacity: 20,
    usageRules: 'Cancha sintetica. Usar zapatos adecuados y respetar el horario reservado.',
  },
  {
    name: 'Coliseo Robledo',
    type: 'coliseo',
    campus: 'Robledo',
    capacity: 200,
    usageRules: 'Uso exclusivo con reserva. No ingresar alimentos al area de juego.',
  },
];

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

  for (const space of demoSpaces) {
    const existing = await prisma.space.findFirst({ where: { name: space.name } });
    const saved = existing
      ? await prisma.space.update({ where: { id: existing.id }, data: space })
      : await prisma.space.create({ data: space });

    await prisma.availabilityRule.deleteMany({
      where: { spaceId: saved.id, kind: AvailabilityKind.WEEKLY_HOURS },
    });
    await prisma.availabilityRule.createMany({
      data: WEEKDAYS.map((dayOfWeek) => ({
        spaceId: saved.id,
        kind: AvailabilityKind.WEEKLY_HOURS,
        dayOfWeek,
        startTime: '06:00',
        endTime: '22:00',
      })),
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
