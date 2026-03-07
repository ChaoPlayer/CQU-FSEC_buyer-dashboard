const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 创建普通用户
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: hashedPassword,
      name: '普通用户',
      role: 'USER',
    },
  });
  console.log('普通用户创建成功:', user.email, '密码: password123');

  // 创建管理员用户
  const adminHashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminHashedPassword,
      name: '管理员',
      role: 'ADMIN',
    },
  });
  console.log('管理员用户创建成功:', admin.email, '密码: admin123');

  // 可选：创建一些测试采购记录
  const purchases = [
    {
      itemName: 'MacBook Pro 16寸',
      amount: 19999.99,
      currency: 'CNY',
      status: 'PENDING',
      userId: user.id,
    },
    {
      itemName: '办公椅',
      amount: 899.5,
      currency: 'CNY',
      status: 'APPROVED',
      userId: user.id,
    },
    {
      itemName: '显示器',
      amount: 2499.0,
      currency: 'CNY',
      status: 'REJECTED',
      userId: admin.id,
    },
  ];

  for (const data of purchases) {
    const purchase = await prisma.purchase.create({
      data,
    });
    console.log(`采购记录创建成功: ${purchase.itemName} (${purchase.status})`);
  }

  console.log('测试数据创建完成！');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });