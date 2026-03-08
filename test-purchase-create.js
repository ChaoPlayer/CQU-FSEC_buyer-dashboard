const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 获取一个用户ID（管理员）
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      console.error('未找到用户');
      return;
    }
    console.log('使用用户:', user.email);
    
    const purchase = await prisma.purchase.create({
      data: {
        itemName: '测试物品',
        amount: 100.50,
        currency: 'CNY',
        category: '电子元件',
        processorContact: null,
        status: 'PENDING',
        userId: user.id,
      },
    });
    console.log('采购创建成功:', purchase);
  } catch (error) {
    console.error('创建采购时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();