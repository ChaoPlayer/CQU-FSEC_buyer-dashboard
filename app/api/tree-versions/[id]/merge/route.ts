import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// 审批树版本（合并或驳回）
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

    // 只有组长或管理员可以审批
    if (session.user.role !== "GROUP_LEADER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要组长或管理员权限" }, { status: 403 });
    }

    const version: any = await prisma.treeVersion.findUnique({
      where: { id },
      include: {
        tree: {
          select: {
            id: true,
            name: true,
            groupId: true,
            creatorId: true,
            creator: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
        submitter: {
          select: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ message: "版本不存在" }, { status: 404 });
    }
    if (version.status !== "PENDING") {
      return NextResponse.json({ message: "版本状态不是待审核，无法操作" }, { status: 400 });
    }

    // 权限检查：组长只能审批本组的版本
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { groupId: true, role: true },
    });
    const userGroupId = user?.groupId;
    if (session.user.role === "GROUP_LEADER" && version.tree.groupId !== userGroupId) {
      return NextResponse.json({ message: "只能审批本组的版本" }, { status: 403 });
    }

    // 额外验证：如果树的创建者是组长，只有创建者可以审批
    if (version.tree.creator?.role === "GROUP_LEADER" && version.tree.creatorId !== session.user.id) {
      return NextResponse.json(
        { message: "该进度树由组长创建，只有创建者可以审批此版本" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, hours, description, rejectionReason, newVersionName, newVersionDesc } = body; // action: "approve" 或 "reject"
    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ message: "action 必须为 'approve' 或 'reject'" }, { status: 400 });
    }

    // 如果是批准，必须提供工时（小时数）
    if (action === "approve" && (hours === undefined || hours === null)) {
      return NextResponse.json({ message: "批准时必须提供工时数" }, { status: 400 });
    }

    // 如果是驳回，可以提供驳回理由
    if (action === "reject" && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return NextResponse.json({ message: "驳回时必须提供驳回理由" }, { status: 400 });
    }

    const updateData: any = {
      status: action === "approve" ? "MERGED" : "REJECTED",
      mergedById: action === "approve" ? session.user.id : null,
      mergedAt: action === "approve" ? new Date() : null,
      rejectionReason: action === "reject" ? rejectionReason : null,
    };

    // 如果批准，创建工时记录
    let hourRecord = null;
    if (action === "approve") {
      // 检查是否已存在关联的工时记录
      const existingHourRecord = await prisma.hourRecord.findFirst({
        where: { treeVersion: { id } },
      });
      if (existingHourRecord) {
        return NextResponse.json({ message: "该版本已关联工时记录，无法重复发放" }, { status: 409 });
      }

      // 创建工时记录（不在这里connect treeVersion，因为FK在TreeVersion一侧）
      hourRecord = await prisma.hourRecord.create({
        data: {
          userId: version.submitterId,
          type: "WORK",
          hours: parseFloat(hours),
          description: description || `进度树 "${version.tree.name}" 版本 V${version.versionNumber} 合并工时`,
        },
      });

      // 通过TreeVersion的hourRecordId来建立关联
      updateData.hourRecordId = hourRecord.id;
    }

    // 更新分支版本状态
    const updatedVersion = await prisma.treeVersion.update({
      where: { id },
      data: updateData,
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
        hourRecord: action === "approve" ? {
          select: {
            id: true,
            hours: true,
            description: true,
          },
        } : undefined,
      },
    });

    // 如果是批准：创建一个新的主线版本来代表合并结果
    let newMainVersion = null;
    if (action === "approve") {
      // 查询当前最大 versionNumber
      const lastMain = await prisma.treeVersion.findFirst({
        where: { treeId: version.tree.id, type: "MAIN" },
        orderBy: { versionNumber: "desc" },
      });
      const nextNumber = (lastMain?.versionNumber ?? 0) + 1;
      newMainVersion = await prisma.treeVersion.create({
        data: {
          treeId: version.tree.id,
          submitterId: session.user.id, // 合并者作为提交人
          type: "MAIN",
          status: "MERGED",
          versionNumber: nextNumber,
          fileName: version.fileName,
          fileUrl: (version as any).fileUrl || null,
          description: newVersionDesc || `合并分支：${version.fileName || `V${version.versionNumber}`}`,
          name: newVersionName || null,
          parentVersionId: version.id,
          mergedById: session.user.id,
          mergedAt: new Date(),
        },
      });
    }

    // 查询审批者姓名
    const approverUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { realName: true, email: true },
    });
    const approverName = approverUser?.realName || approverUser?.email || session.user.email || "未知用户";

    // 发送通知给提交者
    const notificationTitle = action === "approve"
      ? `版本合并批准：${version.tree.name} V${version.versionNumber}`
      : `版本被驳回：${version.tree.name} V${version.versionNumber}`;
    const notificationContent = action === "approve"
      ? `您的版本已由 ${approverName} 批准合并，工时 ${hours} 小时已发放。`
      : `您的版本被驳回，理由：${rejectionReason}`;
    await createNotification({
      userId: version.submitterId,
      type: action === "approve" ? "tree_version_merged" : "tree_version_rejected",
      title: notificationTitle,
      content: notificationContent,
    });

    // 如果是批准，额外通知本组其他成员（可选）
    if (action === "approve") {
      const groupMembers = await prisma.user.findMany({
        where: { groupId: version.tree.groupId },
        select: { id: true },
      });
      for (const member of groupMembers) {
        if (member.id !== version.submitterId) {
          await createNotification({
            userId: member.id,
            type: "tree_version_merged",
            title: `版本已合并：${version.tree.name} V${version.versionNumber}`,
            content: `${approverName} 已将 ${version.submitter.realName} 提交的版本合并到主分支。`,
          });
        }
      }
    }

    return NextResponse.json({
      version: updatedVersion,
      hourRecord,
      message: action === "approve" ? "版本已批准并发放工时" : "版本已驳回",
    });
  } catch (error) {
    console.error("审批树版本出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}