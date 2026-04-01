import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    const { newPassword } = await req.json();

    // 验证新密码
    if (typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: "新密码必须为字符串且至少6位" },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // 更新用户密码
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        realName: true,
        role: true,
        group: true,
        maxLimit: true,
        approvalLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "密码重置成功",
      user: updatedUser,
    });
  } catch (error) {
    console.error("管理员重置密码失败:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}