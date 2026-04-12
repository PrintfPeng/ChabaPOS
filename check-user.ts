
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'misskunnaa@gmail.com' }
  });
  console.log('User found:', user ? { id: user.id, email: user.email } : 'Not found');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
