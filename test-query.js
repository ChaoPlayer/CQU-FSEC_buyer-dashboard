const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    console.log('成功获取采购记录，数量:', purchases.length);
    await prisma.$disconnect();
  } catch (error) {
    console.error('查询出错:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();