import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// 获取赛季结算列表（仅管理员）
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
    }

    const settlements = await prisma.seasonSettlement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        startedBy: {
          select: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(settlements);
  } catch (error) {
    console.error("获取赛季结算列表出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 创建新的赛季结算（仅管理员）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const { seasonName, password } = body;

    if (!seasonName) {
      return NextResponse.json({ message: "赛季名称为必填项" }, { status: 400 });
    }

    // 验证管理员密码（可选，可根据实际需求调整）
    // 此处假设密码验证逻辑已由前端处理，或使用固定密码
    // 这里简化处理，实际项目中应使用更安全的验证机制
    if (!password || password !== process.env.SEASON_SETTLEMENT_PASSWORD) {
      return NextResponse.json({ message: "密码错误" }, { status: 401 });
    }

    // 检查是否已存在进行中的赛季结算
    const existingActive = await prisma.seasonSettlement.findFirst({
      where: {
        status: { in: ["NOT_STARTED", "LEADER_CONFIRMATION"] },
      },
    });
    if (existingActive) {
      return NextResponse.json({ message: "已有进行中的赛季结算，请先完成当前结算" }, { status: 409 });
    }

    // 创建赛季结算记录
    const settlement = await prisma.seasonSettlement.create({
      data: {
        seasonName,
        startedById: session.user.id,
        status: "NOT_STARTED",
      },
      include: {
        startedBy: {
          select: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    // 通知所有组长
    const groupLeaders = await prisma.user.findMany({
      where: { role: "GROUP_LEADER" },
      select: { id: true },
    });
    for (const leader of groupLeaders) {
      await createNotification({
        userId: leader.id,
        type: "season_settlement_started",
        title: "赛季结算已启动",
        content: `管理员已启动新的赛季结算，请及时确认本组进度树版本。`,
      });
    }

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    console.error("创建赛季结算出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}