import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'chabapos-superadmin@gmail.com';
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD;

  // Never hardcode the credential — it would be published with the source.
  if (!plainPassword) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD is not set. Add it to .env before running the seed ' +
      '(see .env.example).',
    );
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN' }, // idempotent: update role if user already exists
    create: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super Admin ready: ${admin.email} (id=${admin.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
