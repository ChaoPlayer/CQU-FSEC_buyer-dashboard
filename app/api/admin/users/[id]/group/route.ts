import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = id;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const { group } = await req.json();

    // 验证 group 是否为字符串或 null
    if (group !== null && typeof group !== "string") {
      return NextResponse.json(
        { error: "分组必须为字符串或 null" },
        { status: 400 }
      );
    }

    // 更新用户组别
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { group },
      select: {
        id: true,
        email: true,
        realName: true,
        role: true,
        maxLimit: true,
        approvalLimit: true,
        group: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("更新用户组别失败:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}