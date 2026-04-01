import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "未经授权" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "当前密码和新密码均为必填项" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "新密码长度至少为6位" },
        { status: 400 }
      );
    }

    // 获取当前用户（含密码字段）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // 验证当前密码
    if (!user.password) {
      // 用户没有密码（例如通过OAuth登录）
      return NextResponse.json(
        { success: false, message: "当前账号未设置密码，无法修改" },
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "当前密码错误" },
        { status: 400 }
      );
    }

    // 加密新密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    });
  } catch (error: any) {
    console.error("修改密码失败:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", error: error.message },
      { status: 500 }
    );
  }
}