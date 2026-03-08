import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyPurchaseStatusChange } from "@/lib/notifications";
import { Purchase, User, Status } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        submittedBy: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ message: "采购记录不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body; // "request", "approve", "reject"

    // 用户请求撤回
    if (action === "request") {
      // 只有采购提交者可以请求撤回
      if (purchase.userId !== session.user.id) {
        return NextResponse.json({ message: "无权操作" }, { status: 403 });
      }
      // 只有状态为 PENDING 的采购可以请求撤回
      if (purchase.status !== "PENDING") {
        return NextResponse.json(
          { message: "只有待审核的采购可以申请撤回" },
          { status: 400 }
        );
      }
      const oldStatus = purchase.status;
      // 更新状态为 WITHDRAWAL_REQUESTED
      const updated = await prisma.purchase.update({
        where: { id },
        data: { status: "WITHDRAWAL_REQUESTED" as any },
        include: { submittedBy: true },
      });

      // 发送通知
      await notifyPurchaseStatusChange(updated as Purchase & { submittedBy: User }, oldStatus, updated.status);

      return NextResponse.json({
        message: "撤回申请已提交，等待管理员审批",
        purchase: updated,
      });
    }

    // 管理员批准撤回
    if (action === "approve") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
      }
      if ((purchase.status as string) !== "WITHDRAWAL_REQUESTED") {
        return NextResponse.json(
          { message: "只有撤回申请中的采购可以批准撤回" },
          { status: 400 }
        );
      }
      const oldStatus = purchase.status;
      const updated = await prisma.purchase.update({
        where: { id },
        data: { status: "WITHDRAWN" as any },
        include: { submittedBy: true },
      });

      // 发送通知
      await notifyPurchaseStatusChange(updated as Purchase & { submittedBy: User }, oldStatus, updated.status);

      return NextResponse.json({
        message: "撤回申请已批准，采购状态已更新为已撤回",
        purchase: updated,
      });
    }

    // 管理员拒绝撤回
    if (action === "reject") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
      }
      if ((purchase.status as string) !== "WITHDRAWAL_REQUESTED") {
        return NextResponse.json(
          { message: "只有撤回申请中的采购可以拒绝撤回" },
          { status: 400 }
        );
      }
      const oldStatus = purchase.status;
      const updated = await prisma.purchase.update({
        where: { id },
        data: { status: "PENDING" },
        include: { submittedBy: true },
      });

      // 发送通知
      await notifyPurchaseStatusChange(updated as Purchase & { submittedBy: User }, oldStatus, updated.status);

      return NextResponse.json({
        message: "撤回申请已拒绝，采购状态已恢复为待审核",
        purchase: updated,
      });
    }

    return NextResponse.json({ message: "无效的操作" }, { status: 400 });
  } catch (error) {
    console.error("处理撤回申请时出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}