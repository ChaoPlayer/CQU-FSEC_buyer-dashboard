/**
 * 迁移脚本：
 * 1. 给 ProgressTree 表加 seasonId 列
 * 2. 查出所有 SeasonSettlement，按时间排序（旧→新）
 * 3. 把测试数据：一半进度树打上"测试赛季"（旧赛季，结算为 COMPLETED），另一半打上"测试赛季2"（新赛季，保持 NOT_STARTED/活跃）
 *
 * 注意：seasonId 列可能已存在（如果已运行过 prisma db push），脚本会捕获该错误并继续
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Step 1: 用 prisma $executeRawUnsafe 添加列（SQLite不支持 IF NOT EXISTS，捕获错误即可）
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProgressTree" ADD COLUMN "seasonId" TEXT REFERENCES "SeasonSettlement"("id");`);
    console.log('✓ 成功添加 seasonId 列');
  } catch (e) {
    if (e.message && e.message.includes('duplicate column')) {
      console.log('→ seasonId 列已存在，跳过 ALTER TABLE');
    } else {
      throw e;
    }
  }

  // Step 2: 重新生成 Prisma client（刷新缓存）
  // 查询所有赛季（按时间从旧到新）
  const settlements = await prisma.$queryRawUnsafe(
    `SELECT id, seasonName, status, createdAt FROM "SeasonSettlement" ORDER BY createdAt ASC`
  );
  console.log(`找到 ${settlements.length} 个赛季：`);
  settlements.forEach(s => console.log(`  - ${s.seasonName} (${s.status}) id=${s.id}`));

  if (settlements.length === 0) {
    console.log('没有赛季数据，跳过数据打标签');
    return;
  }

  // Step 3: 查询所有进度树
  const trees = await prisma.$queryRawUnsafe(
    `SELECT id, name FROM "ProgressTree" ORDER BY createdAt ASC`
  );
  console.log(`\n找到 ${trees.length} 个进度树：`);
  trees.forEach(t => console.log(`  - ${t.name} (id=${t.id})`));

  if (trees.length === 0) {
    console.log('没有进度树数据，跳过');
    return;
  }

  // Step 4: 分配赛季标签
  // 策略：如果有 >=2 个赛季，前半进度树 → 最旧赛季，后半 → 第二新赛季（或最新赛季）
  // 如果只有 1 个赛季，所有进度树 → 该赛季
  const oldSeason = settlements[0]; // 最旧赛季（设为 COMPLETED）
  const newSeason = settlements.length >= 2 ? settlements[settlements.length - 1] : settlements[0]; // 最新赛季

  const half = Math.ceil(trees.length / 2);
  const oldTrees = trees.slice(0, half);
  const newTrees = trees.slice(half);

  console.log(`\n将 ${oldTrees.length} 个进度树归入旧赛季 "${oldSeason.seasonName}"`);
  for (const t of oldTrees) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ProgressTree" SET "seasonId" = ? WHERE "id" = ?`,
      oldSeason.id, t.id
    );
    // 同时归档这些进度树
    await prisma.$executeRawUnsafe(
      `UPDATE "ProgressTree" SET "status" = 'ARCHIVED' WHERE "id" = ?`,
      t.id
    );
    console.log(`  ✓ ${t.name} → ${oldSeason.seasonName} (ARCHIVED)`);
  }

  console.log(`\n将 ${newTrees.length} 个进度树归入新赛季 "${newSeason.seasonName}"`);
  for (const t of newTrees) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ProgressTree" SET "seasonId" = ? WHERE "id" = ?`,
      newSeason.id, t.id
    );
    // 新赛季的进度树保持 ACTIVE
    await prisma.$executeRawUnsafe(
      `UPDATE "ProgressTree" SET "status" = 'ACTIVE' WHERE "id" = ?`,
      t.id
    );
    console.log(`  ✓ ${t.name} → ${newSeason.seasonName} (ACTIVE)`);
  }

  // Step 5: 把最旧赛季设为 COMPLETED 状态
  await prisma.$executeRawUnsafe(
    `UPDATE "SeasonSettlement" SET "status" = 'COMPLETED', "completedAt" = datetime('now') WHERE "id" = ?`,
    oldSeason.id
  );
  console.log(`\n✓ 赛季 "${oldSeason.seasonName}" 已设为 COMPLETED`);

  // Step 6: 验证
  console.log('\n--- 验证结果 ---');
  const result = await prisma.$queryRawUnsafe(
    `SELECT pt.name, pt.status, pt.seasonId, ss.seasonName, ss.status as seasonStatus
     FROM "ProgressTree" pt
     LEFT JOIN "SeasonSettlement" ss ON pt.seasonId = ss.id
     ORDER BY pt.createdAt ASC`
  );
  result.forEach(r => {
    console.log(`  进度树: ${r.name} | 状态: ${r.status} | 赛季: ${r.seasonName || '无'} | 赛季状态: ${r.seasonStatus || '无'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
