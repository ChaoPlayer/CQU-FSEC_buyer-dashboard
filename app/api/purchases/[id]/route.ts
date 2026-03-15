import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyPurchaseStatusChange } from "@/lib/notifications";
import { Purchase, User } from "@prisma/client";

// 获取单个采购详情
export async function GET(
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
        submittedBy: {
          select: {
            id: true,
            email: true,
            realName: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ message: "采购记录不存在" }, { status: 404 });
    }

    // 权限检查：用户只能查看自己的采购，管理员可以查看所有
    if (session.user.role !== "ADMIN" && purchase.userId !== session.user.id) {
      return NextResponse.json({ message: "无权访问" }, { status: 403 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("获取采购详情出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 更新采购（例如状态变更）
export async function PUT(
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
    });

    if (!purchase) {
      return NextResponse.json({ message: "采购记录不存在" }, { status: 404 });
    }

    // 只有管理员可以更新采购状态，用户只能更新自己的采购（某些字段）
    const body = await request.json();
    const { status, note, rejectionReason, materialCategory, hasInvoice, isAdvancedPayment, advancerName } = body;

    // 如果用户是管理员，可以更新状态；否则只能更新备注
    const data: any = {};
    if (session.user.role === "ADMIN") {
      if (status) data.status = status;
      // 管理员可以设置拒绝理由（仅当状态为 REJECTED 或明确提供时）
      if (rejectionReason !== undefined) {
        data.rejectionReason = rejectionReason;
      }
      // 如果状态变为 APPROVED，清除拒绝理由
      if (status === "APPROVED") {
        data.rejectionReason = null;
      }
      // 如果状态变为 REJECTED 但未提供拒绝理由，保持原有拒绝理由（可能为空）
    }
    if (note !== undefined) data.note = note;
    if (materialCategory !== undefined) data.materialCategory = materialCategory;
    if (hasInvoice !== undefined) data.hasInvoice = hasInvoice;
    if (isAdvancedPayment !== undefined) data.isAdvancedPayment = isAdvancedPayment;
    if (advancerName !== undefined) data.advancerName = advancerName;

    // 确保用户只能更新自己的采购（除非是管理员）
    if (session.user.role !== "ADMIN" && purchase.userId !== session.user.id) {
      return NextResponse.json({ message: "无权修改" }, { status: 403 });
    }

    const oldStatus = purchase.status;

    const updated = await prisma.purchase.update({
      where: { id },
      data,
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            realName: true,
          },
        },
      },
    });

    // 如果状态发生变化，创建状态历史记录并发送通知
    if (oldStatus !== updated.status) {
      await prisma.purchaseStatusHistory.create({
        data: {
          purchaseId: id,
          status: updated.status,
          reason: rejectionReason || null,
          createdBy: session.user.id,
        },
      });
      await notifyPurchaseStatusChange(updated as Purchase & { submittedBy: User }, oldStatus, updated.status);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新采购出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 删除采购
export async function DELETE(
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
    });

    if (!purchase) {
      return NextResponse.json({ message: "采购记录不存在" }, { status: 404 });
    }

    // 只有管理员或采购提交者本人可以删除
    if (session.user.role !== "ADMIN" && purchase.userId !== session.user.id) {
      return NextResponse.json({ message: "无权删除" }, { status: 403 });
    }

    await prisma.purchase.delete({
      where: { id },
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除采购出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}