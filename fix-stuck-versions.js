const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stuckVersions = await prisma.treeVersion.findMany({
    where: {
      status: 'PENDING',
      hourRecordId: { not: null },
    },
    include: {
      tree: { select: { name: true } },
      submitter: { select: { realName: true, email: true } },
      hourRecord: { select: { id: true, hours: true } },
    },
  });

  if (stuckVersions.length === 0) {
    console.log('没有发现脏数据，所有版本状态正常。');
    return;
  }

  console.log(`发现 ${stuckVersions.length} 个卡住的版本：`);
  for (const v of stuckVersions) {
    console.log(`- 版本ID: ${v.id}, 进度树: ${v.tree.name}, 提交者: ${v.submitter.realName || v.submitter.email}, 工时: ${v.hourRecord?.hours}h`);
  }

  for (const v of stuckVersions) {
    await prisma.treeVersion.update({
      where: { id: v.id },
      data: {
        status: 'MERGED',
        mergedAt: new Date(),
      },
    });
    console.log(`已修复版本 ${v.id}`);
  }

  console.log('脏数据修复完成。');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
