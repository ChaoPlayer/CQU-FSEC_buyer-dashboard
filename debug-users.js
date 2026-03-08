const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('所有用户:');
  users.forEach(u => console.log(`- ${u.id} ${u.email} ${u.role}`));
  await prisma.$disconnect();
}
main().catch(console.error);