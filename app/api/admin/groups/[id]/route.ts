import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/groups/[id] - 获取单个组别详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const group = await prisma.teamGroup.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            realName: true,
            studentId: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "组别不存在" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("获取组别详情失败:", error);
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/groups/[id] - 更新组别名称
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "组别名称不能为空" },
        { status: 400 }
      );
    }

    // 检查是否已存在同名组别（排除自己）
    const existing = await prisma.teamGroup.findFirst({
      where: {
        name: name.trim(),
        id: { not: id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "组别名称已存在" },
        { status: 409 }
      );
    }

    const updatedGroup = await prisma.teamGroup.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("更新组别失败:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "组别不存在" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/groups/[id] - 删除组别
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 检查组别下是否有用户
    const userCount = await prisma.user.count({
      where: { groupId: id },
    });
    if (userCount > 0) {
      return NextResponse.json(
        { error: "无法删除含有用户的组别，请先迁移用户" },
        { status: 400 }
      );
    }

    await prisma.teamGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除组别失败:", error);
    if (error instanceof Error && error.message.includes("Record to delete not found")) {
      return NextResponse.json({ error: "组别不存在" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}