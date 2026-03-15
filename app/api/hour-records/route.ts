import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { HourType } from "@prisma/client";

// 获取工时记录
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") as HourType | null;
    const groupBy = searchParams.get("groupBy"); // user, date, type

    // 权限：管理员可以查看所有用户的记录，普通用户只能查看自己的
    const where: any = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }
    if (type) {
      where.type = type;
    }

    // 如果按用户分组（用于管理员统计）
    if (groupBy === "user" && session.user.role === "ADMIN") {
      const records = await prisma.hourRecord.groupBy({
        by: ["userId"],
        where,
        _sum: {
          hours: true,
        },
        orderBy: {
          _sum: {
            hours: "desc",
          },
        },
      });
      // 获取用户信息
      const userIds = records.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, realName: true, group: true },
      });
      const result = records.map(record => ({
        userId: record.userId,
        totalHours: record._sum.hours,
        user: users.find(u => u.id === record.userId),
      }));
      return NextResponse.json(result);
    }

    // 如果按组别分组（用于柱状图）
    if (groupBy === "group" && session.user.role === "ADMIN") {
      // 先获取每个用户的工时总和，再按组别聚合
      const userHours = await prisma.hourRecord.groupBy({
        by: ["userId"],
        where,
        _sum: {
          hours: true,
        },
      });
      const userIds = userHours.map(uh => uh.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, group: true },
      });
      // 按组别汇总
      const groupMap: Record<string, number> = {};
      userHours.forEach(uh => {
        const user = users.find(u => u.id === uh.userId);
        const group = user?.group || "未分组";
        groupMap[group] = (groupMap[group] || 0) + (uh._sum.hours || 0);
      });
      const result = Object.entries(groupMap).map(([group, totalHours]) => ({
        group,
        totalHours,
      })).sort((a, b) => b.totalHours - a.totalHours); // 降序排序
      return NextResponse.json(result);
    }

    // 默认返回原始记录列表
    const records = await prisma.hourRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            realName: true,
            group: true,
          },
        },
        workSubmission: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("获取工时记录出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 创建工时记录（用于管理员手动添加考勤工时）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, type, hours, description } = body;

    if (!userId || !type || hours === undefined) {
      return NextResponse.json(
        { message: "用户ID、类型和工时数为必填项" },
        { status: 400 }
      );
    }

    const record = await prisma.hourRecord.create({
      data: {
        userId,
        type,
        hours: parseFloat(hours),
        date: new Date(),
        description: description || null,
      },
    });

    // 通知用户
    await prisma.notification.create({
      data: {
        userId,
        type: "attendance_hours_added",
        title: "考勤工时已添加",
        content: `管理员为您添加了 ${hours} 小时考勤工时。`,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("创建工时记录出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}