import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Group, Role } from "@prisma/client";

// 获取用户资料（当前用户或指定用户）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    // 确定要查询的用户ID
    let userId: string;
    if (targetUserId && session.user.role === "ADMIN") {
      // 管理员可以查看任意用户
      userId = targetUserId;
    } else {
      // 否则只能查看自己的资料
      userId = session.user.id;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        realName: true,
        studentId: true,
        group: true,
        role: true,
        maxLimit: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("获取用户资料失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// 更新用户资料
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    const body = await req.json();
    const { name, realName, studentId, group, maxLimit, role } = body;

    // 确定要更新的用户ID
    let userId: string;
    if (targetUserId && session.user.role === "ADMIN") {
      // 管理员可以更新任意用户
      userId = targetUserId;
    } else {
      // 否则只能更新自己的资料
      userId = session.user.id;
    }

    // 获取目标用户当前数据，用于权限验证
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 权限检查：非管理员用户只能更新自己的组别
    const isAdmin = session.user.role === "ADMIN";
    const isSelf = userId === session.user.id;

    // 构建更新数据对象
    const data: any = {};
    if (isAdmin) {
      // 管理员可以更新所有字段
      if (name !== undefined) data.name = name;
      if (realName !== undefined) data.realName = realName;
      if (studentId !== undefined) data.studentId = studentId;
      if (group !== undefined) data.group = group;
      if (maxLimit !== undefined) data.maxLimit = maxLimit === null ? null : Number(maxLimit);
      if (role !== undefined) {
        // 只有管理员可以更改角色
        if (!Object.values(Role).includes(role)) {
          return NextResponse.json({ error: "无效的角色" }, { status: 400 });
        }
        data.role = role;
      }
    } else {
      // 普通用户只能更新自己的组别
      if (!isSelf) {
        return NextResponse.json({ error: "无权修改其他用户资料" }, { status: 403 });
      }
      // 只允许组别字段
      if (group !== undefined) {
        data.group = group;
      } else {
        // 没有其他字段可更新
        return NextResponse.json({ error: "只能修改组别字段" }, { status: 400 });
      }
    }

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        realName: true,
        studentId: true,
        group: true,
        role: true,
        maxLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("更新用户资料失败:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "P2025") {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}