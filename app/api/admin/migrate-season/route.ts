import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 临时迁移路由：
 * 1. 给 ProgressTree 表加 seasonId 列
 * 2. 把测试数据分配到两个赛季
 * 用完后可删除此文件
 */
export async function POST() {
  const log: string[] = [];

  try {
    // Step 1: 添加 seasonId 列
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ProgressTree" ADD COLUMN "seasonId" TEXT REFERENCES "SeasonSettlement"("id");`
      );
      log.push("✓ 成功添加 seasonId 列");
    } catch (e: any) {
      if (e.message?.includes("duplicate column")) {
        log.push("→ seasonId 列已存在，跳过");
      } else {
        throw e;
      }
    }

    // Step 2: 查询所有赛季（从旧到新）
    const settlements = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, seasonName, status, createdAt FROM "SeasonSettlement" ORDER BY createdAt ASC`
    );
    log.push(`找到 ${settlements.length} 个赛季`);

    if (settlements.length === 0) {
      return NextResponse.json({ log, message: "无赛季数据" });
    }

    // Step 3: 查询所有进度树（从旧到新）
    const trees = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name FROM "ProgressTree" ORDER BY createdAt ASC`
    );
    log.push(`找到 ${trees.length} 个进度树`);

    if (trees.length === 0) {
      return NextResponse.json({ log, message: "无进度树数据" });
    }

    // Step 4: 前半 → 最旧赛季（COMPLETED），后半 → 最新赛季（活跃）
    const oldSeason = settlements[0];
    const newSeason = settlements[settlements.length - 1];
    const half = Math.ceil(trees.length / 2);
    const oldTrees = trees.slice(0, half);
    const newTrees = trees.slice(half);

    for (const t of oldTrees) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ProgressTree" SET "seasonId" = ?, "status" = 'ARCHIVED' WHERE "id" = ?`,
        oldSeason.id, t.id
      );
      log.push(`  归档 "${t.name}" → ${oldSeason.seasonName}`);
    }

    for (const t of newTrees) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ProgressTree" SET "seasonId" = ?, "status" = 'ACTIVE' WHERE "id" = ?`,
        newSeason.id, t.id
      );
      log.push(`  激活 "${t.name}" → ${newSeason.seasonName}`);
    }

    // Step 5: 最旧赛季设为 COMPLETED
    await prisma.$executeRawUnsafe(
      `UPDATE "SeasonSettlement" SET "status" = 'COMPLETED', "completedAt" = datetime('now') WHERE "id" = ?`,
      oldSeason.id
    );
    log.push(`✓ 赛季 "${oldSeason.seasonName}" 已设为 COMPLETED`);

    // Step 6: 验证
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pt.name, pt.status, ss.seasonName, ss.status as seasonStatus
       FROM "ProgressTree" pt
       LEFT JOIN "SeasonSettlement" ss ON pt.seasonId = ss.id
       ORDER BY pt.createdAt ASC`
    );

    return NextResponse.json({ success: true, log, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, log }, { status: 500 });
  }
}
