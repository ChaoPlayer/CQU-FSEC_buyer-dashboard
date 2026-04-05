import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

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

      // 通知所有组长进入确认阶段
      const groupLeaders = await prisma.user.findMany({
        where: { role: "GROUP_LEADER" },
        select: { id: true },
      });
      for (const leader of groupLeaders) {
        await createNotification({
          userId: leader.id,
          type: "season_settlement_started",
          title: `赛季结算进入组长确认阶段：${settlement.seasonName}`,
          content: `管理员已推进赛季结算到组长确认阶段，请及时登录系统，标记本组需要保留的进度树版本（在进度树详情页版本列表中操作）。`,
        });
      }
    }

    if (targetStatus === "COMPLETED") {
      updateData.completedAt = new Date();

      // ── 归档逻辑 ──
      // 1. 将所有活跃进度树状态改为 ARCHIVED
      await prisma.progressTree.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "ARCHIVED" },
      });

      // 2. 将所有未被 seasonKept 标记的 PENDING 分支版本改为 REJECTED（归档处理）
      await prisma.treeVersion.updateMany({
        where: {
          status: "PENDING",
          seasonKept: false,
        },
        data: {
          status: "REJECTED",
          rejectionReason: `赛季结算（${settlement.seasonName}）完成，未被保留的待审核版本已自动归档`,
        },
      });

      // 3. 通知所有用户赛季结算完成
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });
      for (const user of allUsers) {
        await createNotification({
          userId: user.id,
          type: "season_settlement_started",
          title: `赛季结算已完成：${settlement.seasonName}`,
          content: `${settlement.seasonName} 赛季结算已完成，所有进度树已归档。新赛季进度树将由管理员重新创建。`,
        });
      }
    }

    const updated = await prisma.seasonSettlement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("推进赛季结算状态出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
