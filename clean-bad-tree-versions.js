const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始清理导致时间轴杂乱的旧合并测试数据...');

  // 找到那些由于旧逻辑被合并的分支，但没有生成对应的主线节点的脏数据
  // 我们直接删除 V2 和 V4，以及相关的记录
  // 为了安全，我们通过名字或者版本号来找
  
  const badNames = ['测试2', '测试4', '测试666'];
  
  const badVersions = await prisma.treeVersion.findMany({
    where: {
      OR: [
        { fileName: { in: badNames } },
        { name: { in: badNames } },
        { description: { contains: '测试' } } // 宽泛一点
      ],
      // 排除 V1 (测试1) 和 V3 (测试3) 和 V6
      NOT: {
        OR: [
          { fileName: '测试1' },
          { fileName: '测试3' },
          { fileName: '测试6' }
        ]
      }
    }
  });

  console.log(`找到 ${badVersions.length} 条可能是脏数据的记录。`);
  
  for (const v of badVersions) {
    console.log(`- 准备删除: [${v.type}] ${v.fileName || v.name} (V${v.versionNumber}) - 状态: ${v.status}`);
    
    // 如果它有关联的工时记录，先删工时记录
    if (v.hourRecordId) {
      await prisma.hourRecord.delete({ where: { id: v.hourRecordId } }).catch(e => console.log('无关联工时'));
    }
    
    // 删除版本
    await prisma.treeVersion.delete({ where: { id: v.id } });
    console.log(`  ✓ 已删除`);
  }
  
  console.log('清理完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
