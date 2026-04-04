import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { targetStatus } = body;

    if (!targetStatus || !["LEADER_CONFIRMATION", "COMPLETED"].includes(targetStatus)) {
      return NextResponse.json({ message: "目标状态无效" }, { status: 400 });
    }

    const settlement = await prisma.seasonSettlement.findUnique({
      where: { id },
    });
    if (!settlement) {
      return NextResponse.json({ message: "赛季结算不存在" }, { status: 404 });
    }

    // 状态转换验证
    if (settlement.status === "COMPLETED") {
      return NextResponse.json({ message: "赛季结算已完成，无法修改" }, { status: 409 });
    }
    if (settlement.status === "NOT_STARTED" && targetStatus !== "LEADER_CONFIRMATION") {
      return NextResponse.json({ message: "只能从 NOT_STARTED 推进到 LEADER_CONFIRMATION" }, { status: 409 });
    }
    if (settlement.status === "LEADER_CONFIRMATION" && targetStatus !== "COMPLETED") {
      return NextResponse.json({ message: "只能从 LEADER_CONFIRMATION 推进到 COMPLETED" }, { status: 409 });
    }

    // 执行状态更新
    const updateData: any = {
      status: targetStatus,
    };
    if (targetStatus === "LEADER_CONFIRMATION") {
      updateData.startedAt = new Date();
      // 这里可以添加锁定逻辑：禁止新版本提交和合并
      // 例如，设置一个全局标志或记录日志
    }
    if (targetStatus === "COMPLETED") {
      updateData.completedAt = new Date();
      // 这里可以添加清理逻辑：删除未保留的版本文件，更新 seasonKept 等
      // 暂时只更新状态
    }

    const updated = await prisma.seasonSettlement.update({
      where: { id },
      data: updateData,
    });

    // 根据状态发送通知
    // 可以调用 createNotification 通知组长或管理员
    // 暂时省略

    return NextResponse.json(updated);
  } catch (error) {
    console.error("推进赛季结算状态出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}