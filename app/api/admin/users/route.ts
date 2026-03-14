import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        realName: true,
        studentId: true,
        group: true,
        role: true,
        maxLimit: true,
        approvalLimit: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 获取每个用户的采购统计
    const userIds = users.map(u => u.id);
    const purchaseStats = await prisma.purchase.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds }
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });

    // 获取待审批数量
    const pendingStats = await prisma.purchase.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'PENDING',
      },
      _count: {
        _all: true,
      },
    });

    // 构建统计映射
    const statsMap = new Map();
    purchaseStats.forEach(stat => {
      statsMap.set(stat.userId, {
        totalPurchases: stat._count._all,
        totalAmount: stat._sum.amount || 0,
      });
    });
    pendingStats.forEach(stat => {
      const existing = statsMap.get(stat.userId) || { totalPurchases: 0, totalAmount: 0 };
      existing.pendingCount = stat._count._all;
      statsMap.set(stat.userId, existing);
    });

    // 合并到用户对象
    const usersWithStats = users.map(user => {
      const stats = statsMap.get(user.id) || { totalPurchases: 0, totalAmount: 0, pendingCount: 0 };
      return {
        ...user,
        ...stats,
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { id, role, maxLimit, approvalLimit } = await req.json();
    console.log('PUT /api/admin/users', { id, role, maxLimit, approvalLimit });
    if (!id) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 验证角色
    if (role && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    // 获取旧用户数据以比较限额
    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: { maxLimit: true, approvalLimit: true, email: true, name: true },
    });

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(maxLimit !== undefined && { maxLimit: maxLimit === null ? null : Number(maxLimit) }),
        ...(approvalLimit !== undefined && { approvalLimit: approvalLimit === null ? null : Number(approvalLimit) }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // @ts-ignore
        maxLimit: true,
        approvalLimit: true,
        createdAt: true,
      },
    });

    // 如果限额发生变化，发送通知
    if (maxLimit !== undefined && oldUser && oldUser.maxLimit !== updatedUser.maxLimit) {
      const oldLimitText = oldUser.maxLimit ? `¥${oldUser.maxLimit.toFixed(2)}` : '无限制';
      const newLimitText = updatedUser.maxLimit ? `¥${updatedUser.maxLimit.toFixed(2)}` : '无限制';
      await createNotification({
        userId: id,
        type: 'limit_updated',
        title: '报销限额变更',
        content: `您的报销限额已从 ${oldLimitText} 变更为 ${newLimitText}。`,
      });
    }

    console.log('用户更新成功', updatedUser);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("更新用户失败:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "P2025") {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}