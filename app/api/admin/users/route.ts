import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        maxLimit: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
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
    const { id, role, maxLimit } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 验证角色
    if (role && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(maxLimit !== undefined && { maxLimit: maxLimit === null ? null : Number(maxLimit) }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // @ts-ignore
        maxLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("更新用户失败:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "P2025") {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}