import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification, notifyNewWorkSubmission } from "@/lib/notifications";
import { WorkSubmissionStatus } from "@prisma/client";

// 获取工作提交列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") as WorkSubmissionStatus | null;

    // 管理员可以查看所有提交，普通用户只能查看自己的
    const where: any = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    const submissions = await prisma.workSubmission.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("获取工作提交列表出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 创建新工作提交
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, fileUrl, fileName } = body;

    if (!title) {
      return NextResponse.json(
        { message: "工作名称为必填项" },
        { status: 400 }
      );
    }

    const submission = await prisma.workSubmission.create({
      data: {
        title,
        description: description || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        status: WorkSubmissionStatus.PENDING,
        userId: session.user.id,
      },
    });

    // 获取包含用户信息的完整提交对象
    const submissionWithUser = await prisma.workSubmission.findUnique({
      where: { id: submission.id },
      include: { user: true },
    });
    if (submissionWithUser) {
      await notifyNewWorkSubmission(submissionWithUser);
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("创建工作提交出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}