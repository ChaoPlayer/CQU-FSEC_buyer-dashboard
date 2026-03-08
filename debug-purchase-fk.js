const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 获取普通用户
    const user = await prisma.user.findUnique({
      where: { email: 'user@example.com' },
    });
    console.log('普通用户:', user);
    
    // 尝试创建采购
    const purchase = await prisma.purchase.create({
      data: {
        itemName: '调试采购',
        amount: 50.0,
        currency: 'CNY',
        category: '电子元件',
        processorContact: null,
        status: 'PENDING',
        userId: user.id,
      },
    });
    console.log('采购创建成功:', purchase);
  } catch (error) {
    console.error('错误:', error);
    console.error('错误代码:', error.code);
    console.error('错误元数据:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();