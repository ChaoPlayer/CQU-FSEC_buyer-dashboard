import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// 获取单个进度树详情
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

    const tree = await prisma.progressTree.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          include: {
            submitter: {
              select: {
                id: true,
                realName: true,
                email: true,
              },
            },
            mergedBy: {
              select: {
                id: true,
                realName: true,
                email: true,
              },
            },
            hourRecord: {
              select: {
                id: true,
                hours: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!tree) {
      return NextResponse.json({ message: "进度树不存在" }, { status: 404 });
    }

    // 权限检查：ADMIN 和 GROUP_LEADER 可以查看任何组，普通用户只能查看自己组
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true },
    });
    const userGroupId = user?.groupId;
    const isAdmin = session.user.role === "ADMIN";
    const isGroupLeader = session.user.role === "GROUP_LEADER";
    if (!isAdmin && !isGroupLeader && tree.groupId !== userGroupId) {
      return NextResponse.json({ message: "无权访问" }, { status: 403 });
    }

    return NextResponse.json(tree);
  } catch (error) {
    console.error("获取进度树详情出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 更新进度树（仅限组长或管理员）
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

    const tree = await prisma.progressTree.findUnique({
      where: { id },
    });

    if (!tree) {
      return NextResponse.json({ message: "进度树不存在" }, { status: 404 });
    }

    // 检查权限：只有组长（同组）或管理员可以更新
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true, role: true },
    });
    const userGroupId = user?.groupId;
    const isAdmin = user?.role === "ADMIN";
    const isGroupLeader = user?.role === "GROUP_LEADER";

    if (!isAdmin && (!isGroupLeader || tree.groupId !== userGroupId)) {
      return NextResponse.json({ message: "无权更新" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status } = body;

    // 构建更新数据
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;

    // 如果重命名，检查同组内是否已存在同名进度树
    if (name && name !== tree.name) {
      const existingTree = await prisma.progressTree.findFirst({
        where: { name, groupId: tree.groupId, NOT: { id } },
      });
      if (existingTree) {
        return NextResponse.json({ message: "该组已存在同名进度树" }, { status: 409 });
      }
    }

    const updatedTree = await prisma.progressTree.update({
      where: { id },
      data,
      include: {
        group: {
          select: { name: true },
        },
      },
    });

    // 通知本组所有成员（可选）
    if (name !== tree.name || status !== tree.status) {
      const groupMembers = await prisma.user.findMany({
        where: { groupId: tree.groupId },
        select: { id: true },
      });
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          type: "progress_tree_updated",
          title: `进度树已更新：${updatedTree.name}`,
          content: `进度树 "${tree.name}" 已被更新。新名称：${updatedTree.name}，新状态：${updatedTree.status}`,
        });
      }
    }

    return NextResponse.json(updatedTree);
  } catch (error) {
    console.error("更新进度树出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 删除进度树（仅限组长或管理员）
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

    const tree = await prisma.progressTree.findUnique({
      where: { id },
    });

    if (!tree) {
      return NextResponse.json({ message: "进度树不存在" }, { status: 404 });
    }

    // 检查权限：只有组长（同组）或管理员可以删除
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true, role: true },
    });
    const userGroupId = user?.groupId;
    const isAdmin = user?.role === "ADMIN";
    const isGroupLeader = user?.role === "GROUP_LEADER";

    if (!isAdmin && (!isGroupLeader || tree.groupId !== userGroupId)) {
      return NextResponse.json({ message: "无权删除" }, { status: 403 });
    }

    // 删除进度树前，先删除关联的版本（级联删除已在 Prisma schema 中定义）
    await prisma.progressTree.delete({
      where: { id },
    });

    // 通知本组所有成员
    const groupMembers = await prisma.user.findMany({
      where: { groupId: tree.groupId },
      select: { id: true },
    });
    for (const member of groupMembers) {
      await createNotification({
        userId: member.id,
        type: "progress_tree_deleted",
        title: `进度树已删除：${tree.name}`,
        content: `进度树 "${tree.name}" 已被删除。`,
      });
    }

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除进度树出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}