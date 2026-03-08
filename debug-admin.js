const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking User table columns...');
    // 尝试查询用户，包括 maxLimit 字段
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        maxLimit: true,
        createdAt: true,
      },
    });
    console.log('Users:', JSON.stringify(users, null, 2));
    
    // 检查表结构
    const result = await prisma.$queryRaw`PRAGMA table_info(User)`;
    console.log('User table schema:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();