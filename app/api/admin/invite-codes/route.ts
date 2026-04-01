import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 生成7位大写字母和数字的随机字符串
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    // 尝试多种可能的模型键名
    const prismaKeys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
    const possibleKeys = ['inviteCode', 'inviteCodes', 'InviteCode'];
    let inviteCodeModel = undefined;
    for (const key of possibleKeys) {
      if ((prisma as any)[key]) {
        inviteCodeModel = (prisma as any)[key];
        console.log(`Found inviteCode model with key: ${key}`);
        break;
      }
    }
    console.log('inviteCodeModel:', inviteCodeModel);
    // 调试日志：检查模型是否存在
    if (!inviteCodeModel) {
      console.error("InviteCode model not found on prisma client. Available keys:", prismaKeys);
      throw new Error("数据库模型未就绪，请检查 Prisma 生成状态");
    }

    // 1. 查询当前未使用的邀请码数量
    const unusedCount = await inviteCodeModel.count({
      where: { isUsed: false },
    });

    // 2. 如果不足5个，生成补足
    if (unusedCount < 5) {
      const needed = 5 - unusedCount;
      for (let i = 0; i < needed; i++) {
        let code: string;
        let attempts = 0;
        // 确保生成的邀请码唯一（极小概率重复，但保险起见）
        while (true) {
          code = generateInviteCode();
          const existing = await inviteCodeModel.findUnique({
            where: { code },
          });
          if (!existing) break;
          attempts++;
          if (attempts > 10) {
            // 极端情况，增加随机性
            code = generateInviteCode() + Date.now().toString().slice(-3);
          }
        }
        await inviteCodeModel.create({
          data: {
            code,
            isUsed: false,
          },
        });
      }
    }

    // 3. 返回5个未使用的邀请码（按创建时间倒序，取最新的）
    const inviteCodes = await inviteCodeModel.findMany({
      where: { isUsed: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        isUsed: true,
        usedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(inviteCodes);
  } catch (error: any) {
    console.error("Invite Code API Error:", error);
    // 返回详细的错误信息，便于前端调试
    const errorMessage = error instanceof Error ? error.message : "未知内部错误";
    return NextResponse.json(
      {
        error: "服务器内部错误",
        message: errorMessage,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}