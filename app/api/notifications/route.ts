import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// 获取当前用户的通知列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    // 确保 session.user.id 存在
    if (!session.user?.id) {
      console.warn('session 缺少 user.id，返回空通知列表');
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = { userId: session.user.id };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        purchase: {
          select: {
            id: true,
            itemName: true,
          },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("获取通知列表时出错:", error);
    // 发生错误时返回空数组，避免前端崩溃
    return NextResponse.json({
      notifications: [],
      unreadCount: 0,
    });
  }
}

// 标记所有通知为已读
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { markAllAsRead, notificationId } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ message: "所有通知已标记为已读" });
    }

    if (notificationId) {
      // 检查通知是否属于当前用户
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      if (!notification || notification.userId !== session.user.id) {
        return NextResponse.json({ message: "无权操作" }, { status: 403 });
      }
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({ message: "通知已标记为已读" });
    }

    return NextResponse.json({ message: "无效请求" }, { status: 400 });
  } catch (error) {
    console.error("标记通知为已读时出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}