const { prisma } = require('./lib/prisma');

async function test() {
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
    process.exit(0);
  } catch (error) {
    console.error('查询出错:', error);
    process.exit(1);
  }
}

test();