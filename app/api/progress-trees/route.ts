import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// 获取进度树列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");

    // 根据角色构建筛选条件
    const where: any = {};
    if (session.user.role === "ADMIN") {
      // 管理员可以看到所有进度树，除非指定了 groupId
      if (groupId) {
        where.groupId = groupId;
      }
    } else if (session.user.role === "GROUP_LEADER") {
      // 组长可以看到本组的所有进度树
      const leader = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { groupId: true }
      });
      const leaderGroupId = leader?.groupId;
      if (!leaderGroupId) {
        return NextResponse.json({ message: "您不属于任何组" }, { status: 403 });
      }
      where.groupId = leaderGroupId;
    } else {
      // 普通用户只能看到本组的进度树（USER 角色）
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { groupId: true }
      });
      const userGroupId = user?.groupId;
      if (!userGroupId) {
        return NextResponse.json({ message: "您不属于任何组" }, { status: 403 });
      }
      where.groupId = userGroupId;
    }
    if (status) {
      where.status = status;
    }

    const trees = await prisma.progressTree.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            status: true,
            versionNumber: true,
            fileName: true,
            submitter: {
              select: {
                id: true,
                realName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(trees);
  } catch (error) {
    console.error("获取进度树列表出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 创建新的进度树（仅限组长与管理员）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "GROUP_LEADER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ message: "需要组长或管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ message: "进度树名称为必填项" }, { status: 400 });
    }

    // 获取组长所属组别
    const leader = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true }
    });
    const groupId = leader?.groupId;
    if (!groupId) {
      return NextResponse.json({ message: "您不属于任何组" }, { status: 403 });
    }

    // 检查同组内是否存在同名进度树
    const existingTree = await prisma.progressTree.findFirst({
      where: { name, groupId },
    });
    if (existingTree) {
      return NextResponse.json({ message: "该组已存在同名进度树" }, { status: 409 });
    }

    const tree = await prisma.progressTree.create({
      data: {
        name,
        description: description || null,
        groupId,
        creatorId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        group: {
          select: { name: true },
        },
      },
    });

    // 通知本组所有成员（可选）
    const groupMembers = await prisma.user.findMany({
      where: { groupId },
      select: { id: true },
    });
    for (const member of groupMembers) {
      await createNotification({
        userId: member.id,
        type: "progress_tree_created",
        title: `新进度树已创建：${name}`,
        content: `组长创建了新的进度树 "${name}"，请查看并提交文件。`,
      });
    }

    return NextResponse.json(tree, { status: 201 });
  } catch (error) {
    console.error("创建进度树出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}