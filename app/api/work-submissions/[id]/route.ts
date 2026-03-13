import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification, notifyWorkSubmissionApproval } from "@/lib/notifications";
import { WorkSubmissionStatus, HourType } from "@prisma/client";

// 获取单个工作提交详情
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

    const submission = await prisma.workSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            group: true,
          },
        },
        hourRecords: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ message: "工作提交不存在" }, { status: 404 });
    }

    // 权限检查：用户只能查看自己的提交，管理员可以查看所有
    if (session.user.role !== "ADMIN" && submission.userId !== session.user.id) {
      return NextResponse.json({ message: "无权访问" }, { status: 403 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("获取工作提交详情出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 更新工作提交（审批/拒绝）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "需要管理员权限" }, { status: 403 });
    }

    const submission = await prisma.workSubmission.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!submission) {
      return NextResponse.json({ message: "工作提交不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { status, approvedHours, rejectionReason } = body;

    // 只有管理员可以更新状态和批准工时
    const data: any = {};
    if (status) {
      if (!Object.values(WorkSubmissionStatus).includes(status)) {
        return NextResponse.json({ message: "无效的状态" }, { status: 400 });
      }
      data.status = status;
      if (status === WorkSubmissionStatus.APPROVED) {
        data.approvedAt = new Date();
        data.approvedBy = session.user.id;
        if (approvedHours !== undefined) {
          data.approvedHours = parseFloat(approvedHours);
        } else {
          return NextResponse.json(
            { message: "批准时必须填写兑换工时" },
            { status: 400 }
          );
        }
      } else if (status === WorkSubmissionStatus.REJECTED) {
        // 可以记录拒绝理由（如果有）
        // 这里我们暂时不存储拒绝理由，因为模型中没有此字段，可后续添加
      }
    }

    // 更新工作提交
    const updatedSubmission = await prisma.workSubmission.update({
      where: { id },
      data,
    });

    // 如果状态变为 APPROVED，创建工时记录
    if (status === WorkSubmissionStatus.APPROVED && approvedHours) {
      await prisma.hourRecord.create({
        data: {
          type: HourType.WORK,
          hours: parseFloat(approvedHours),
          date: new Date(),
          description: `工作提交兑换：${submission.title}`,
          userId: submission.userId,
          submissionId: submission.id,
        },
      });

      // 通知用户工时已兑换
      await notifyWorkSubmissionApproval(submission, parseFloat(approvedHours));
    } else if (status === WorkSubmissionStatus.REJECTED) {
      // 通知用户申请被拒绝
      await createNotification({
        userId: submission.userId,
        type: "work_submission_rejected",
        title: `工作申请被拒绝：${submission.title}`,
        content: `您的工作 "${submission.title}" 已被管理员拒绝。`,
      });
    }

    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error("更新工作提交出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}