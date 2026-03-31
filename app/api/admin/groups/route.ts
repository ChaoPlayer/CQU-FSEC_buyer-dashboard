import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/groups - 获取所有组别
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const groups = await prisma.teamGroup.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("获取组别列表失败:", error);
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}

// POST /api/admin/groups - 创建新组别
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "组别名称不能为空" },
        { status: 400 }
      );
    }

    // 检查是否已存在同名组别
    const existing = await prisma.teamGroup.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "组别名称已存在" },
        { status: 409 }
      );
    }

    const newGroup = await prisma.teamGroup.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("创建组别失败:", error);
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}