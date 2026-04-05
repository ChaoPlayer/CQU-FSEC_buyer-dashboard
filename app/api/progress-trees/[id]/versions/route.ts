import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { VersionType, VersionStatus } from "@prisma/client";

// 获取某个进度树的所有版本列表
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
      select: { groupId: true },
    });

    if (!tree) {
      return NextResponse.json({ message: "进度树不存在" }, { status: 404 });
    }

    // 权限检查：用户只能查看自己组的进度树版本
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true },
    });
    const userGroupId = user?.groupId;
    if (session.user.role !== "ADMIN" && tree.groupId !== userGroupId) {
      return NextResponse.json({ message: "无权访问" }, { status: 403 });
    }

    const versions = await prisma.treeVersion.findMany({
      where: { treeId: id },
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
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error("获取进度树版本列表出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 提交新版本（分支）
export async function POST(
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
      select: {
        id: true,
        name: true,
        groupId: true,
        status: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!tree) {
      return NextResponse.json({ message: "进度树不存在" }, { status: 404 });
    }
    if (tree.status === "ARCHIVED") {
      return NextResponse.json({ message: "进度树已归档，无法提交新版本" }, { status: 400 });
    }

    // 检查是否有进行中的赛季结算（锁定状态）
    const activeSettlement = await prisma.seasonSettlement.findFirst({
      where: { status: { in: ["NOT_STARTED", "LEADER_CONFIRMATION"] } },
    });
    if (activeSettlement) {
      return NextResponse.json(
        { message: `赛季结算进行中（${activeSettlement.seasonName}），已锁定所有进度树，无法提交新版本` },
        { status: 423 }
      );
    }

    // 权限检查：用户只能向自己组的进度树提交版本
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true, role: true },
    });
    const userGroupId = user?.groupId;
    if (session.user.role !== "ADMIN" && tree.groupId !== userGroupId) {
      return NextResponse.json({ message: "无权提交版本" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, fileSize, filePath, description, versionNumber, type, name, parentVersionId, forceMain } = body;

    if (!fileName || !filePath) {
      return NextResponse.json({ message: "文件名和文件路径为必填项" }, { status: 400 });
    }
    if (!description || description.trim().length === 0) {
      return NextResponse.json({ message: "修改说明为必填项" }, { status: 400 });
    }

    // 决策逻辑：根据角色和创建者关系确定版本类型与状态
    let versionType: VersionType = "BRANCH";
    let versionStatus: VersionStatus = "PENDING";
    let mergedById: string | undefined = undefined;
    let mergedAt: Date | undefined = undefined;

    if (session.user.role === "GROUP_LEADER") {
      // 组长在自己组的树中提交 => 免审批
      versionType = "MAIN";
      versionStatus = "MERGED";
      mergedById = session.user.id;
      mergedAt = new Date();
    } else if (session.user.role === "ADMIN") {
      if (tree.creatorId === session.user.id || forceMain) {
        // 管理员是创建者，或者前端选择了"强制写入主线" => 免审批
        versionType = "MAIN";
        versionStatus = "MERGED";
        mergedById = session.user.id;
        mergedAt = new Date();
      } else {
        // 非创建者管理员，默认走分支审批
        versionType = "BRANCH";
        versionStatus = "PENDING";
      }
    } else {
      // USER 角色
      versionType = "BRANCH";
      versionStatus = "PENDING";
    }

    // 确定版本号：如果未提供，自动计算下一个版本号
    let finalVersionNumber = versionNumber;
    if (!finalVersionNumber) {
      const lastVersion = await prisma.treeVersion.findFirst({
        where: { treeId: id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      finalVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;
    }

    // 检查版本号是否重复
    const duplicateVersion = await prisma.treeVersion.findFirst({
      where: { treeId: id, versionNumber: finalVersionNumber },
    });
    if (duplicateVersion) {
      return NextResponse.json({ message: "版本号已存在" }, { status: 409 });
    }

    const version = await prisma.treeVersion.create({
      data: {
        treeId: id,
        submitterId: session.user.id,
        fileName,
        fileUrl: filePath,
        description,
        name: name?.trim() || null,
        versionNumber: finalVersionNumber,
        type: versionType,
        status: versionStatus,
        ...(mergedById && { mergedById }),
        ...(mergedAt && { mergedAt }),
        ...(parentVersionId && { parentVersionId }),
      },
      include: {
        submitter: {
          select: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    // 通知本组所有成员
    const groupMembers = await prisma.user.findMany({
      where: { groupId: tree.groupId },
      select: { id: true, role: true },
    });
    // 查询提交者姓名
    const submitterUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { realName: true, email: true },
    });
    const submitterName = submitterUser?.realName || submitterUser?.email || session.user.email || "未知用户";

    if (versionStatus === "MERGED") {
      // 自动合并版本：通知所有成员新版本已合并
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          type: "tree_version_merged",
          title: `新版本已自动合并：${tree.name} V${finalVersionNumber}`,
          content: `${submitterName} 提交的进度树 "${tree.name}" 新版本已自动合并为主版本（${fileName}）。`,
        });
      }
    } else {
      // 待审核分支：通知所有成员有新提交
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          type: "tree_version_submitted",
          title: `新版本提交：${tree.name} V${finalVersionNumber}`,
          content: `${submitterName} 提交了进度树 "${tree.name}" 的新版本（${fileName}），请审核。`,
        });
      }
      // 特别通知组长（如果提交者不是组长）
      const groupLeaders = groupMembers.filter(m => m.role === "GROUP_LEADER");
      for (const leader of groupLeaders) {
        if (leader.id !== session.user.id) {
          await createNotification({
            userId: leader.id,
            type: "tree_version_submitted",
            title: `有新的分支提交待审核`,
            content: `${submitterName} 提交了进度树 "${tree.name}" 的新版本，请及时处理。`,
          });
        }
      }
    }

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error("提交进度树版本出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}